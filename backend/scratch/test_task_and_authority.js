const { db } = require('../src/config/database');
const taskService = require('../src/services/taskService');
const approvalService = require('../src/services/approvalService');

async function runTests() {
  console.log('============================================================');
  console.log('STARTING TASK ASSIGNMENT & APPROVAL AUTHORITY TEST SUITE');
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

  let createdTask = null;
  let contentId = null;

  try {
    const workspaceId = 1;
    const manager = { id: 2, email: 'manager@socialdesk.test', full_name: 'Sufyan Aly', role: 'workspace_manager' };
    const graphicHead = { id: 9, email: 'head@socialdesk.test', full_name: 'ab', role: 'graphic_team_head' };
    const designer = { id: 6, email: 'designer@socialdesk.test', full_name: 'Abu Sufyan', role: 'graphic_designer' };
    const clientUser = { id: 7, email: 'tesla@socialdesk.test', full_name: 'Tesla Inc', role: 'client_user' };

    const [clientRows] = await db.query('SELECT id, name FROM clients WHERE workspace_id = ? LIMIT 1', [workspaceId]);
    const clientId = clientRows[0]?.id || 1;

    console.log(`Workspace: ${workspaceId}`);
    console.log(`Manager: ${manager.full_name} (${manager.role})`);
    console.log(`Graphic Head: ${graphicHead.full_name} (${graphicHead.role})`);
    console.log(`Designer: ${designer.full_name} (${designer.role})`);
    console.log(`Client User: ${clientUser.full_name} (${clientUser.role})\n`);

    // ---------------------------------------------------------
    // TEST 1: Manager creates task assigned to Designer
    // ---------------------------------------------------------
    console.log('--- TEST 1: Manager Creates Task Assigned to Graphic Designer ---');
    createdTask = await taskService.createTask(manager, workspaceId, {
      title: 'Automated Test Task #1 - Hero Banner Design',
      description: 'Design new marketing banner for Autumn promotion.',
      clientId,
      assignedTo: designer.id,
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      status: 'TODO',
    });

    assert(createdTask && createdTask.id > 0, `Task created successfully with ID: ${createdTask.id}`);
    assert(Number(createdTask.assigned_to) === Number(designer.id), `Task assigned_to persists as integer (${designer.id}) in MySQL`);
    assert(createdTask.assignee_name === designer.full_name, `Assignee name populated: "${createdTask.assignee_name}"`);
    assert(createdTask.client_name !== undefined, `Client name populated: "${createdTask.client_name}"`);

    // ---------------------------------------------------------
    // TEST 2: Designer queries My Tasks
    // ---------------------------------------------------------
    console.log('\n--- TEST 2: Designer Queries My Tasks ---');
    const myTasks = await taskService.getMyTasks(designer, workspaceId);
    const foundInMyTasks = myTasks.some(t => t.id === createdTask.id);
    assert(foundInMyTasks, `Designer retrieves newly assigned task via GET /tasks/my`);

    // ---------------------------------------------------------
    // TEST 3: Invalid Reassignment Validation (Security Check)
    // ---------------------------------------------------------
    console.log('\n--- TEST 3: Invalid Reassignment (Non-Workspace User) ---');
    let invalidReassignBlocked = false;
    try {
      await taskService.reassignTask(manager, workspaceId, createdTask.id, 99999);
    } catch (err) {
      if (err.status === 400) {
        invalidReassignBlocked = true;
        console.log(`  Expected 400 Caught: "${err.message}"`);
      }
    }
    assert(invalidReassignBlocked, `Backend BLOCKED reassignment to non-workspace user ID with HTTP 400`);

    // ---------------------------------------------------------
    // TEST 4: Manager Reassigns Task to Graphic Head
    // ---------------------------------------------------------
    console.log('\n--- TEST 4: Manager Reassigns Task to Graphic Head ---');
    const reassignedTask = await taskService.reassignTask(manager, workspaceId, createdTask.id, graphicHead.id);
    assert(Number(reassignedTask.assigned_to) === Number(graphicHead.id), `Task assigned_to updated to Graphic Head ID (${graphicHead.id}) in MySQL`);

    const headTasks = await taskService.getMyTasks(graphicHead, workspaceId);
    assert(headTasks.some(t => t.id === createdTask.id), `Graphic Head now sees reassigned task in My Tasks`);

    // ---------------------------------------------------------
    // TEST 5: Create Content Item & Submit for Internal Review
    // ---------------------------------------------------------
    console.log('\n--- TEST 5: Create Content Item & Submit for Internal Review ---');
    const [contentResult] = await db.query(
      `INSERT INTO content (workspace_id, client_id, created_by, assigned_to, title, caption, status, created_at)
       VALUES (?, ?, ?, ?, 'Hero Promo Post for Testing', 'Check out our latest autumn collection!', 'DRAFT', NOW())`,
      [workspaceId, clientId, designer.id, designer.id]
    );
    contentId = contentResult.insertId;

    const submitRes = await approvalService.submitInternalReview(designer, workspaceId, contentId, {
      notes: 'Initial creative ready for internal review by Graphic Head.',
    });
    assert(submitRes.status === 'INTERNAL_REVIEW', `Content submitted for internal review, status is now INTERNAL_REVIEW`);

    // ---------------------------------------------------------
    // TEST 6: Designer Attempts Internal Approval (SECURITY CHECK)
    // ---------------------------------------------------------
    console.log('\n--- TEST 6: Designer Attempts Internal Approval (Security Verification) ---');
    let designerApprovalBlocked = false;
    try {
      await approvalService.internalApprove(designer, workspaceId, contentId, {
        notes: 'Designer attempting self-approval (MUST FAIL)',
      });
    } catch (err) {
      if (err.status === 403) {
        designerApprovalBlocked = true;
        console.log(`  Expected 403 Caught: "${err.message}"`);
      }
    }
    assert(designerApprovalBlocked, `Backend BLOCKED Graphic Designer from approving internal review with HTTP 403 Forbidden`);

    // ---------------------------------------------------------
    // TEST 7: Designer Attempts Internal Revision (SECURITY CHECK)
    // ---------------------------------------------------------
    console.log('\n--- TEST 7: Designer Attempts Internal Revision (Security Verification) ---');
    let designerRevisionBlocked = false;
    try {
      await approvalService.internalRevision(designer, workspaceId, contentId, {
        notes: 'Designer attempting to issue revision (MUST FAIL)',
      });
    } catch (err) {
      if (err.status === 403) {
        designerRevisionBlocked = true;
        console.log(`  Expected 403 Caught: "${err.message}"`);
      }
    }
    assert(designerRevisionBlocked, `Backend BLOCKED Graphic Designer from requesting internal revision with HTTP 403 Forbidden`);

    // ---------------------------------------------------------
    // TEST 8: Graphic Head Performs Internal Approval
    // ---------------------------------------------------------
    console.log('\n--- TEST 8: Graphic Head Performs Internal Approval ---');
    const headApprovalRes = await approvalService.internalApprove(graphicHead, workspaceId, contentId, {
      notes: 'Creative aesthetics verified by Graphic Head. Forwarding to client review.',
    });
    assert(headApprovalRes.status === 'CLIENT_REVIEW', `Graphic Head approved content -> Moved to CLIENT_REVIEW`);

    // ---------------------------------------------------------
    // TEST 9: Manager Records Client Approval
    // ---------------------------------------------------------
    console.log('\n--- TEST 9: Manager Records Client Approval ---');
    const clientApproveRes = await approvalService.externalClientApprove(manager, workspaceId, contentId, {
      source: 'WhatsApp',
      notes: 'Client confirmed approval via WhatsApp group at 10:00 AM.',
      approvedBy: 'Client Director',
    });
    assert(clientApproveRes.status === 'APPROVED', `Client approval recorded -> Content is APPROVED and ready for Calendar`);

    // ---------------------------------------------------------
    // TEST 10: Unauthorized User Cannot Create Workspace Tasks
    // ---------------------------------------------------------
    console.log('\n--- TEST 10: Unauthorized Executor Cannot Create Tasks ---');
    let executorTaskCreateBlocked = false;
    try {
      await taskService.createTask(designer, workspaceId, {
        title: 'Unauthorized Task by Designer',
      });
    } catch (err) {
      if (err.status === 403) {
        executorTaskCreateBlocked = true;
        console.log(`  Expected 403 Caught: "${err.message}"`);
      }
    }
    assert(executorTaskCreateBlocked, `Backend BLOCKED Graphic Designer from creating workspace tasks with HTTP 403 Forbidden`);

    // ---------------------------------------------------------
    // CLEANUP TEST DATA
    // ---------------------------------------------------------
    if (createdTask?.id) {
      await db.query('DELETE FROM tasks WHERE id = ?', [createdTask.id]);
    }
    if (contentId) {
      await db.query('DELETE FROM content_approvals WHERE content_id = ?', [contentId]);
      await db.query('DELETE FROM content_comments WHERE content_id = ?', [contentId]);
      await db.query('DELETE FROM content WHERE id = ?', [contentId]);
    }
    console.log('\nCleaned up all temporary test records from database.');

  } catch (err) {
    console.error('CRITICAL UNEXPECTED ERROR IN TEST SUITE:', err);
    failed++;
  } finally {
    console.log('\n============================================================');
    console.log(`TEST SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log('============================================================');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
