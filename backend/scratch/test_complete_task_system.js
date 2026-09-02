const { db } = require('../src/config/database');
const taskService = require('../src/services/taskService');
const approvalService = require('../src/services/approvalService');
const dashboardService = require('../src/services/dashboardService');

async function runEndToEndTests() {
  console.log('============================================================');
  console.log('STARTING SOCIALDESK COMPLETE TASK SYSTEM END-TO-END VERIFICATION');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  let createdTaskId = null;

  try {
    const workspaceId = 1;
    const manager = { id: 2, email: 'manager@socialdesk.test', full_name: 'Sufyan Aly', role: 'workspace_manager' };
    const graphicHead = { id: 9, email: 'head@socialdesk.test', full_name: 'ab', role: 'graphic_team_head' };
    const designer = { id: 6, email: 'designer@socialdesk.test', full_name: 'Abu Sufyan', role: 'graphic_designer' };
    const clientUser = { id: 7, email: 'tesla@socialdesk.test', full_name: 'Tesla Inc', role: 'client_user' };

    const [clientRows] = await db.query('SELECT id, name, company_name FROM clients WHERE workspace_id = ? LIMIT 1', [workspaceId]);
    const client = clientRows[0] || { id: 1, name: 'Glamira' };

    console.log(`Actors:`);
    console.log(`  Manager: ${manager.full_name} (ID: ${manager.id}, Role: ${manager.role})`);
    console.log(`  Assignee (Designer): ${designer.full_name} (ID: ${designer.id}, Role: ${designer.role})`);
    console.log(`  Client: ${client.company_name || client.name} (ID: ${client.id})\n`);

    // ============================================================
    // TEST 1 — CREATE & ASSIGN TASK
    // ============================================================
    console.log('--- TEST 1: Workspace Manager Creates & Assigns Task ---');
    const created = await taskService.createTask(manager, workspaceId, {
      title: 'Glamira Facebook Posting',
      description: 'Create and prepare the Facebook post for the Glamira campaign.',
      instructions: 'Use the approved campaign guidelines. Prepare the creative and caption.',
      clientId: client.id,
      assignedTo: designer.id,
      priority: 'MEDIUM',
      dueDate: '2026-09-02',
      dueTime: '17:00',
      attachments: [
        { fileName: 'campaign-guidelines.pdf', fileUrl: '/assets/campaign-guidelines.pdf', fileType: 'pdf', fileSize: 1048576 },
      ],
    });

    createdTaskId = created.id;
    assert(created && created.id > 0, `Task created in MySQL with ID: ${created.id}`);
    assert(Number(created.assigned_to) === Number(designer.id), `Task assigned_to persists real user ID (${designer.id}) in MySQL`);
    assert(created.assigneeName === designer.full_name, `Assignee name populated: "${created.assigneeName}"`);
    assert(created.instructions === 'Use the approved campaign guidelines. Prepare the creative and caption.', `Task instructions saved in MySQL`);
    assert(created.dueTime === '17:00', `Task due_time saved as "17:00"`);

    // Verify task_attachments and task_activity
    const [attRows] = await db.query('SELECT * FROM task_attachments WHERE task_id = ?', [createdTaskId]);
    assert(attRows.length === 1 && attRows[0].file_name === 'campaign-guidelines.pdf', `Reference attachment saved in task_attachments table`);

    const [actRows] = await db.query('SELECT * FROM task_activity WHERE task_id = ? ORDER BY created_at ASC', [createdTaskId]);
    assert(actRows.length >= 2, `Task creation and assignment logged in task_activity table (${actRows.length} logs)`);

    const [notifRows] = await db.query('SELECT * FROM notifications WHERE user_id = ? AND related_task_id = ?', [designer.id, createdTaskId]);
    assert(notifRows.length >= 1, `Notification record created in notifications table for ${designer.full_name}`);

    // ============================================================
    // TEST 2 — ASSIGNEE VIEW & MY TASKS
    // ============================================================
    console.log('\n--- TEST 2: Assignee Queries My Tasks & Task Details ---');
    const myTasks = await taskService.getMyTasks(designer, workspaceId);
    const foundMyTask = myTasks.find((t) => t.id === createdTaskId);
    assert(foundMyTask !== undefined, `Abu Sufyan retrieves task in GET /api/tasks/my`);
    assert(foundMyTask.client_name === (client.name || client.company_name), `Correct client name linked: "${foundMyTask.client_name}"`);

    const taskDetails = await taskService.getTask(workspaceId, createdTaskId);
    assert(taskDetails.instructions !== '', `Assignee receives detailed instructions`);
    assert(taskDetails.attachments.length === 1, `Assignee receives reference files`);

    // ============================================================
    // TEST 3 — START TASK
    // ============================================================
    console.log('\n--- TEST 3: Assignee Starts Task (TODO -> IN_PROGRESS) ---');
    const inProgressTask = await taskService.updateTaskStatus(designer, workspaceId, createdTaskId, 'IN_PROGRESS');
    assert(inProgressTask.status === 'IN_PROGRESS', `Task status updated to IN_PROGRESS in MySQL`);

    const [startAct] = await db.query('SELECT * FROM task_activity WHERE task_id = ? AND action = "TASK_STARTED"', [createdTaskId]);
    assert(startAct.length >= 1, `Activity "TASK_STARTED" logged for Abu Sufyan`);

    // ============================================================
    // TEST 4 — UPLOAD WORK & SUBMIT FOR REVIEW
    // ============================================================
    console.log('\n--- TEST 4: Assignee Uploads Work & Submits for Review ---');
    await taskService.addAttachment(designer, workspaceId, createdTaskId, {
      fileName: 'glamira-fb-creative-v1.png',
      fileUrl: '/assets/glamira-fb-creative-v1.png',
      fileType: 'image/png',
      fileSize: 2097152,
      attachmentType: 'SUBMISSION',
    });

    const reviewTask = await taskService.updateTaskStatus(designer, workspaceId, createdTaskId, 'READY_FOR_REVIEW');
    assert(reviewTask.status === 'READY_FOR_REVIEW', `Task status updated to READY_FOR_REVIEW in MySQL`);

    const [reviewNotif] = await db.query('SELECT * FROM notifications WHERE user_id = ? AND type = "TASK_READY_FOR_REVIEW"', [manager.id]);
    assert(reviewNotif.length >= 1, `Manager received notification that task is ready for review`);

    // ============================================================
    // TEST 5 — MANAGER REQUESTS CHANGES
    // ============================================================
    console.log('\n--- TEST 5: Manager Requests Changes (READY_FOR_REVIEW -> IN_PROGRESS) ---');
    const changeNote = 'Please resize the creative to 1080x1350 and update the caption.';
    const changeTask = await taskService.updateTaskStatus(manager, workspaceId, createdTaskId, 'IN_PROGRESS', changeNote);
    assert(changeTask.status === 'IN_PROGRESS', `Task status reverted to IN_PROGRESS`);

    const [changeComment] = await db.query('SELECT * FROM task_comments WHERE task_id = ?', [createdTaskId]);
    assert(changeComment.some((c) => c.message.includes('CHANGES REQUESTED')), `Changes requested comment recorded in task_comments table`);

    const [changeNotif] = await db.query('SELECT * FROM notifications WHERE user_id = ? AND type = "TASK_CHANGES_REQUESTED"', [designer.id]);
    assert(changeNotif.length >= 1, `Assignee notified of requested changes in notifications table`);

    // ============================================================
    // TEST 6 — RESUBMIT & COMPLETE TASK
    // ============================================================
    console.log('\n--- TEST 6: Resubmit & Manager Approves / Completes Task ---');
    await taskService.updateTaskStatus(designer, workspaceId, createdTaskId, 'READY_FOR_REVIEW');
    const completedTask = await taskService.updateTaskStatus(manager, workspaceId, createdTaskId, 'COMPLETED');
    assert(completedTask.status === 'COMPLETED', `Task status marked as COMPLETED in MySQL`);
    assert(completedTask.completed_at !== null, `completed_at timestamp persisted in MySQL`);

    const [completeNotif] = await db.query('SELECT * FROM notifications WHERE user_id = ? AND type = "TASK_COMPLETED"', [designer.id]);
    assert(completeNotif.length >= 1, `Assignee received TASK_COMPLETED notification`);

    // ============================================================
    // TEST 7 — REFRESH PERSISTENCE VERIFICATION
    // ============================================================
    console.log('\n--- TEST 7: Raw Database Refresh Persistence Verification ---');
    const [rawTaskRows] = await db.query('SELECT * FROM tasks WHERE id = ?', [createdTaskId]);
    const rawTask = rawTaskRows[0];
    assert(rawTask.status === 'COMPLETED', `Raw MySQL verification: status is COMPLETED`);
    assert(Number(rawTask.assigned_to) === Number(designer.id), `Raw MySQL verification: assigned_to is ${designer.id}`);
    assert(rawTask.completed_at !== null, `Raw MySQL verification: completed_at is set`);

    const [rawComments] = await db.query('SELECT * FROM task_comments WHERE task_id = ?', [createdTaskId]);
    assert(rawComments.length >= 1, `Raw MySQL verification: ${rawComments.length} persistent comments stored`);

    const [rawAttachments] = await db.query('SELECT * FROM task_attachments WHERE task_id = ?', [createdTaskId]);
    assert(rawAttachments.length === 2, `Raw MySQL verification: 2 attachments (1 reference, 1 submission) stored`);

    const [rawActivity] = await db.query('SELECT * FROM task_activity WHERE task_id = ?', [createdTaskId]);
    assert(rawActivity.length >= 5, `Raw MySQL verification: ${rawActivity.length} persistent activity history records stored`);

    // ============================================================
    // TEST 8 — ROLE SECURITY ENFORCEMENT
    // ============================================================
    console.log('\n--- TEST 8: Role Security & Permission Enforcement ---');
    let designerCompleteBlocked = false;
    try {
      // Create a dummy task to test completion by non-manager
      const [dummyRes] = await db.query(
        'INSERT INTO tasks (workspace_id, title, status, created_by, assigned_to) VALUES (?, "Security Test Task", "READY_FOR_REVIEW", ?, ?)',
        [workspaceId, manager.id, designer.id]
      );
      const dummyId = dummyRes.insertId;

      try {
        await taskService.updateTaskStatus(designer, workspaceId, dummyId, 'COMPLETED');
      } catch (e) {
        if (e.status === 403) {
          designerCompleteBlocked = true;
          console.log(`  Expected 403 Caught: "${e.message}"`);
        }
      }
      await db.query('DELETE FROM tasks WHERE id = ?', [dummyId]);
    } catch (e) {
      console.error(e);
    }
    assert(designerCompleteBlocked, `Backend BLOCKED Graphic Designer from completing tasks with HTTP 403 Forbidden`);

    // Content Approval Security Check
    let designerContentApprovalBlocked = false;
    try {
      const [cRes] = await db.query(
        'INSERT INTO content (workspace_id, client_id, title, status, created_by) VALUES (?, ?, "Security Post", "INTERNAL_REVIEW", ?)',
        [workspaceId, client.id, designer.id]
      );
      const testContentId = cRes.insertId;

      try {
        await approvalService.internalApprove(designer, workspaceId, testContentId);
      } catch (e) {
        if (e.status === 403) {
          designerContentApprovalBlocked = true;
          console.log(`  Expected 403 Caught: "${e.message}"`);
        }
      }
      await db.query('DELETE FROM content WHERE id = ?', [testContentId]);
    } catch (e) {
      console.error(e);
    }
    assert(designerContentApprovalBlocked, `Backend BLOCKED Graphic Designer from approving content with HTTP 403 Forbidden`);

    // ============================================================
    // TEST 9 — CROSS WORKSPACE ISOLATION (IDOR DEFENSE)
    // ============================================================
    console.log('\n--- TEST 9: Cross-Workspace Security (IDOR Defense) ---');
    let crossWorkspaceBlocked = false;
    try {
      await taskService.getTask(9999, createdTaskId);
    } catch (e) {
      if (e.status === 404 || e.status === 403) {
        crossWorkspaceBlocked = true;
        console.log(`  Expected Isolation Caught: "${e.message}"`);
      }
    }
    assert(crossWorkspaceBlocked, `Backend BLOCKED access to task from unauthorized workspace ID`);

    // ============================================================
    // TEST 10 — LIVE DATABASE DASHBOARD METRICS
    // ============================================================
    console.log('\n--- TEST 10: Live Dashboard Metrics Calculation ---');
    const dashboardData = await dashboardService.getWorkspaceDashboard(manager, workspaceId);
    assert(dashboardData.stats !== undefined, `Dashboard stats returned`);
    assert(dashboardData.stats.pendingTasks >= 0, `Live pendingTasks calculated from MySQL: ${dashboardData.stats.pendingTasks}`);
    assert(Array.isArray(dashboardData.teamWorkload) && dashboardData.teamWorkload.length > 0, `Team workload calculated dynamically for ${dashboardData.teamWorkload.length} team members`);

    const memberWorkload = dashboardData.teamWorkload.find((m) => m.id === designer.id);
    if (memberWorkload) {
      console.log(`  Abu Sufyan Workload: Active: ${memberWorkload.activeTasks}, Review: ${memberWorkload.reviewTasks}, Completed: ${memberWorkload.completedTasks}, Overdue: ${memberWorkload.overdueTasks}`);
      assert(memberWorkload.completedTasks >= 1, `Live completed tasks count reflects MySQL records`);
    }

    // Clean up test records
    await db.query('DELETE FROM task_attachments WHERE task_id = ?', [createdTaskId]);
    await db.query('DELETE FROM task_comments WHERE task_id = ?', [createdTaskId]);
    await db.query('DELETE FROM task_activity WHERE task_id = ?', [createdTaskId]);
    await db.query('DELETE FROM notifications WHERE related_task_id = ?', [createdTaskId]);
    await db.query('DELETE FROM tasks WHERE id = ?', [createdTaskId]);
    console.log('\nCleaned up all temporary test artifacts from database.');

  } catch (err) {
    console.error('CRITICAL UNEXPECTED ERROR IN TEST SUITE:', err);
    failed++;
  } finally {
    console.log('\n============================================================');
    console.log(`END-TO-END TEST SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log('============================================================');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runEndToEndTests();
