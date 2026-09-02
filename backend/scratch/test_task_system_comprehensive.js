require('dotenv').config();
const { db } = require('../src/config/database');
const taskService = require('../src/services/taskService');
const assetService = require('../src/services/assetService');

async function runAcceptanceTests() {
  console.log('============================================================');
  console.log('STARTING SOCIALDESK TASK MANAGEMENT ACCEPTANCE TEST SUITE');
  console.log('============================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // ------------------------------------------------------------
    // SETUP TEST USERS IN WORKSPACE 4 (Optiwise Solutions)
    // ------------------------------------------------------------
    const wsId = 4;
    const manager = { id: 14, role: 'workspace_manager', full_name: 'Farhan Manager' };
    const head = { id: 15, role: 'graphic_team_head', full_name: 'M Hamza Head' };
    const designer = { id: 18, role: 'graphic_designer', full_name: 'Abu Sufyan Designer' };
    const videoEditor = { id: 16, role: 'video_editor', full_name: 'Ch Faisal Video' };
    const otherWsUser = { id: 6, role: 'graphic_designer', full_name: 'Abu Sufyan WS1' };

    console.log('\n--- 1. ACCEPTANCE TEST: TASK VISIBILITY & ISOLATION ---');

    // Create 3 isolated tasks:
    // Task 1 -> designer (Abu Sufyan, id: 18)
    // Task 2 -> videoEditor (Ch Faisal, id: 16)
    const task1 = await taskService.createTask(manager, wsId, {
      title: 'Automated Test: Designer Post Artwork',
      description: 'Create Instagram square artwork',
      assignedTo: designer.id,
      priority: 'HIGH',
    });

    const task2 = await taskService.createTask(manager, wsId, {
      title: 'Automated Test: Video Editor Summer Reel',
      description: 'Edit 15s TikTok reel',
      assignedTo: videoEditor.id,
      priority: 'MEDIUM',
    });

    // Designer queries listTasks
    const designerTasks = await taskService.listTasks(designer, wsId, {});
    const designerTaskIds = designerTasks.map((t) => t.id);
    assert(designerTaskIds.includes(task1.id), 'Designer CAN see task assigned to him (Task 1)');
    assert(!designerTaskIds.includes(task2.id), 'Designer CANNOT see video editor private task (Task 2)');

    // Video Editor queries listTasks
    const videoTasks = await taskService.listTasks(videoEditor, wsId, {});
    const videoTaskIds = videoTasks.map((t) => t.id);
    assert(videoTaskIds.includes(task2.id), 'Video Editor CAN see task assigned to him (Task 2)');
    assert(!videoTaskIds.includes(task1.id), 'Video Editor CANNOT see designer private task (Task 1)');

    // Manager queries listTasks
    const managerTasks = await taskService.listTasks(manager, wsId, {});
    const managerTaskIds = managerTasks.map((t) => t.id);
    assert(managerTaskIds.includes(task1.id), 'Manager CAN see Task 1');
    assert(managerTaskIds.includes(task2.id), 'Manager CAN see Task 2');

    console.log('\n--- 2. ACCEPTANCE TEST: SECURITY & CROSS-WORKSPACE ISOLATION ---');

    // Cross-workspace user attempting to access Task 1
    try {
      await taskService.getTask(otherWsUser, 1, task1.id);
      assert(false, 'Cross workspace task access was NOT blocked!');
    } catch (err) {
      assert(err.status === 404 || err.message.includes('Task not found'), 'Cross workspace task access properly blocked (404/Not Found in WS1)');
    }

    // Video editor attempting direct GET /api/tasks/:id for Designer's task in WS4
    try {
      await taskService.getTask(videoEditor, wsId, task1.id);
      assert(false, 'Unauthorized single task access was NOT blocked!');
    } catch (err) {
      assert(err.status === 403 || err.message.includes('Permission denied'), 'Unauthorized single task access properly blocked with 403 Forbidden');
    }

    // Attempting cross-workspace assignment (assigning user 6 from WS1 to a task in WS4)
    try {
      await taskService.createTask(manager, wsId, {
        title: 'Cross WS Assignment Attempt',
        assignedTo: otherWsUser.id,
      });
      assert(false, 'Cross workspace user assignment was NOT blocked!');
    } catch (err) {
      assert(err.status === 400 || err.message.includes('does not belong to this workspace'), 'Cross workspace user assignment properly rejected (400)');
    }

    console.log('\n--- 3. ACCEPTANCE TEST: STATUS WORKFLOW & SELF-APPROVAL PREVENTION ---');

    // Designer starts Task 1: TODO -> IN_PROGRESS
    const startedTask = await taskService.updateTaskStatus(designer, wsId, task1.id, 'IN_PROGRESS');
    assert(startedTask.status === 'IN_PROGRESS', 'Designer started task -> status is IN_PROGRESS');

    // Designer uploads a deliverable and submits for review: IN_PROGRESS -> READY_FOR_REVIEW
    const submittedTask = await taskService.updateTaskStatus(designer, wsId, task1.id, 'READY_FOR_REVIEW');
    assert(submittedTask.status === 'READY_FOR_REVIEW', 'Designer submitted for review -> status is READY_FOR_REVIEW');

    // Designer attempts to approve their own work: READY_FOR_REVIEW -> COMPLETED
    try {
      await taskService.updateTaskStatus(designer, wsId, task1.id, 'COMPLETED');
      assert(false, 'Designer was able to self-approve own task!');
    } catch (err) {
      assert(err.status === 403 && err.message.includes('Only Workspace Managers or Team Heads can approve'), 'Designer self-approval BLOCKED with 403 Forbidden');
    }

    // Team Head requests revision on Task 1
    const revisionTask = await taskService.updateTaskStatus(head, wsId, task1.id, 'REVISION_REQUIRED', 'Please change font to Outfit Bold and brighten the image.');
    assert(revisionTask.status === 'REVISION_REQUIRED', 'Team Head requested revision -> status is REVISION_REQUIRED');

    // Check that revision note auto-comment was added
    const commentsAfterRevision = await taskService.getTaskComments(designer, wsId, task1.id);
    const hasRevisionComment = commentsAfterRevision.some((c) => c.text.includes('REVISION REQUESTED:'));
    assert(hasRevisionComment, 'Revision feedback automatically posted to task discussion');

    // Designer starts revision: REVISION_REQUIRED -> IN_PROGRESS
    const reworkTask = await taskService.updateTaskStatus(designer, wsId, task1.id, 'IN_PROGRESS');
    assert(reworkTask.status === 'IN_PROGRESS', 'Designer restarted task after revision -> status is IN_PROGRESS');

    // Designer resubmits: IN_PROGRESS -> READY_FOR_REVIEW
    await taskService.updateTaskStatus(designer, wsId, task1.id, 'READY_FOR_REVIEW');

    // Graphic Team Head approves: READY_FOR_REVIEW -> COMPLETED
    const approvedTask = await taskService.updateTaskStatus(head, wsId, task1.id, 'COMPLETED');
    assert(approvedTask.status === 'COMPLETED', 'Graphic Team Head approved task -> status is COMPLETED');
    assert(approvedTask.completedAt !== null, 'completedAt timestamp recorded in MySQL');

    console.log('\n--- 4. ACCEPTANCE TEST: ATTACHMENTS & DELIVERABLES ---');

    // Add Reference File
    const refAttachment = await taskService.addAttachment(manager, wsId, task1.id, {
      fileName: 'brand-guidelines.pdf',
      fileUrl: '/api/assets/1/file',
      fileType: 'application/pdf',
      fileSize: 2048576,
      attachmentType: 'REFERENCE',
    });
    assert(refAttachment.attachmentType === 'REFERENCE', 'Reference file created with REFERENCE type');

    // Add Assignee Deliverable
    const delivAttachment = await taskService.addAttachment(designer, wsId, task1.id, {
      fileName: 'final-instagram-banner.png',
      fileUrl: '/api/assets/2/file',
      fileType: 'image/png',
      fileSize: 1048576,
      attachmentType: 'SUBMISSION',
    });
    assert(delivAttachment.attachmentType === 'SUBMISSION', 'Deliverable created with SUBMISSION type');

    // Fetch Task Details and verify separation
    const fetchedTask = await taskService.getTask(designer, wsId, task1.id);
    assert(fetchedTask.referenceFiles.length >= 1, 'referenceFiles array contains Reference Files');
    assert(fetchedTask.deliverables.length >= 1, 'deliverables array contains Assignee Deliverables');

    console.log('\n--- 5. ACCEPTANCE TEST: COMMENTS & ACTIVITY LOG ---');

    // Add comment
    const comment = await taskService.addComment(designer, wsId, task1.id, 'Initial version uploaded. Please review.');
    assert(comment.text === 'Initial version uploaded. Please review.', 'Comment text saved accurately');
    assert(comment.userName.includes('Abu Sufyan'), 'Comment contains author full name');

    // Check activity log
    const activity = fetchedTask.activity;
    assert(activity.length >= 4, 'Activity history tracks multiple lifecycle events');
    const actions = activity.map((a) => a.action);
    assert(actions.includes('TASK_CREATED'), 'Activity contains TASK_CREATED');
    assert(actions.includes('TASK_STARTED'), 'Activity contains TASK_STARTED');
    assert(actions.includes('TASK_COMPLETED'), 'Activity contains TASK_COMPLETED');

    console.log('\n============================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('============================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal error during test run:', error);
    process.exit(1);
  }
}

runAcceptanceTests();
