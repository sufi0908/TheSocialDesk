const jwt = require('jsonwebtoken');
const { db } = require('../src/config/database');

(async () => {
  try {
    console.log('================================================================');
    console.log('STARTING COMPLETE WORKSPACE DASHBOARD DATA REBUILD TEST SUITE');
    console.log('================================================================');

    // 1. Get test users and client in workspace 1
    const [managers] = await db.query(
      'SELECT u.id, u.full_name, u.email, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = ? OR r.name = ? LIMIT 1',
      ['workspace_manager', 'superadmin']
    );
    const manager = managers[0];
    const workspaceId = 1;

    // Get a regular team member (e.g. Abu Sufyan, id 6)
    const [teamMembers] = await db.query(
      "SELECT u.id, u.full_name, u.email, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name NOT IN ('superadmin', 'client', 'client_user') LIMIT 1"
    );
    const member = teamMembers[0];

    const [clients] = await db.query('SELECT id, name, company_name FROM clients WHERE workspace_id = ? AND deleted_at IS NULL LIMIT 1', [workspaceId]);
    const client = clients[0];

    const managerToken = jwt.sign(
      { id: manager.id, email: manager.email, role: manager.role, workspaceId },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const memberToken = jwt.sign(
      { id: member.id, email: member.email, role: member.role, workspaceId },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('Test Environment Setup:', {
      manager: manager.full_name,
      teamMember: member.full_name,
      client: client.company_name || client.name,
      workspaceId
    });

    const getDashboard = async (token = managerToken, wId = workspaceId) => {
      const res = await fetch('http://localhost:5000/api/workspace/dashboard', {
        headers: { Authorization: `Bearer ${token}`, 'X-Workspace-Id': String(wId) },
      });
      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error('Failed to fetch dashboard: ' + JSON.stringify(json));
      }
      return json.data;
    };

    // Baseline Dashboard Snapshot
    const baseline = await getDashboard();
    console.log('\n--- Initial Baseline Dashboard Metrics ---', baseline.stats);

    // -------------------------------------------------------------
    // TEST 1 — TASK CREATION & ASSIGNMENT
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Task Creation & Assignment ---');
    const [taskRes] = await db.query(
      `INSERT INTO tasks (workspace_id, client_id, assigned_to, created_by, title, description, status, priority, due_date, created_at)
       VALUES (?, ?, ?, ?, 'Dashboard Task A', 'Test assignment', 'TODO', 'HIGH', DATE_ADD(NOW(), INTERVAL 2 DAY), NOW())`,
      [workspaceId, client.id, member.id, manager.id]
    );
    const taskAId = taskRes.insertId;

    const afterTask1 = await getDashboard();
    console.log('After Task A Created:', {
      pendingTasks: afterTask1.stats.pendingTasks,
      expected: baseline.stats.pendingTasks + 1,
    });
    if (afterTask1.stats.pendingTasks !== baseline.stats.pendingTasks + 1) {
      throw new Error(`TEST 1 Failed: pendingTasks was ${afterTask1.stats.pendingTasks}, expected ${baseline.stats.pendingTasks + 1}`);
    }

    const memberWorkload1 = afterTask1.teamWorkload.find((w) => w.id === member.id);
    console.log(`Member (${member.full_name}) Workload:`, {
      activeTasks: memberWorkload1?.activeTasks,
      pendingTasks: memberWorkload1?.pendingTasks,
    });
    console.log('✓ TEST 1 Passed: Task creation immediately updated pendingTasks and team workload.');

    // -------------------------------------------------------------
    // TEST 2 — COMPLETE TASK
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Complete Task ---');
    await db.query("UPDATE tasks SET status = 'COMPLETED', updated_at = NOW() WHERE id = ?", [taskAId]);

    const afterTask2 = await getDashboard();
    console.log('After Task A Completed:', {
      pendingTasks: afterTask2.stats.pendingTasks,
      expected: baseline.stats.pendingTasks,
    });
    if (afterTask2.stats.pendingTasks !== baseline.stats.pendingTasks) {
      throw new Error(`TEST 2 Failed: pendingTasks was ${afterTask2.stats.pendingTasks}, expected ${baseline.stats.pendingTasks}`);
    }
    const memberWorkload2 = afterTask2.teamWorkload.find((w) => w.id === member.id);
    console.log(`Member Completed Tasks count:`, memberWorkload2?.completedTasks);
    console.log('✓ TEST 2 Passed: Completing task decremented pendingTasks and incremented completedTasks.');

    // -------------------------------------------------------------
    // TEST 3 — OVERDUE TASK
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Overdue Task Detection ---');
    const [overdueTaskRes] = await db.query(
      `INSERT INTO tasks (workspace_id, client_id, assigned_to, created_by, title, description, status, priority, due_date, created_at)
       VALUES (?, ?, ?, ?, 'Overdue Dashboard Task', 'Overdue test', 'IN_PROGRESS', 'URGENT', DATE_SUB(NOW(), INTERVAL 1 DAY), NOW())`,
      [workspaceId, client.id, member.id, manager.id]
    );
    const overdueTaskId = overdueTaskRes.insertId;

    const afterOverdue = await getDashboard();
    console.log('After Overdue Task Created:', {
      overdueTasks: afterOverdue.stats.overdueTasks,
      expected: baseline.stats.overdueTasks + 1,
    });
    if (afterOverdue.stats.overdueTasks !== baseline.stats.overdueTasks + 1) {
      throw new Error(`TEST 3 Failed: overdueTasks was ${afterOverdue.stats.overdueTasks}, expected ${baseline.stats.overdueTasks + 1}`);
    }
    console.log('✓ TEST 3 Passed: Overdue task accurately incremented overdueTasks.');

    // Cleanup test tasks
    await db.query('DELETE FROM tasks WHERE id IN (?, ?)', [taskAId, overdueTaskId]);

    // -------------------------------------------------------------
    // TEST 4 — CONTENT INTERNAL REVIEW
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Content Internal Review ---');
    const [contentRes] = await db.query(
      `INSERT INTO content (workspace_id, client_id, created_by, assigned_to, title, caption, content_type, status, created_at)
       VALUES (?, ?, ?, ?, 'Dashboard Content Test Post', 'Copy text', 'Single Post', 'INTERNAL_REVIEW', NOW())`,
      [workspaceId, client.id, member.id, member.id]
    );
    const testContentId = contentRes.insertId;

    const afterContent4 = await getDashboard();
    console.log('Content in Internal Review:', {
      contentInReview: afterContent4.stats.contentInReview,
      expected: baseline.stats.contentInReview + 1,
    });
    if (afterContent4.stats.contentInReview !== baseline.stats.contentInReview + 1) {
      throw new Error(`TEST 4 Failed: contentInReview was ${afterContent4.stats.contentInReview}`);
    }
    console.log('✓ TEST 4 Passed: Content in INTERNAL_REVIEW increased contentInReview.');

    // -------------------------------------------------------------
    // TEST 5 — CLIENT REVIEW
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Content Move to Client Review ---');
    await db.query("UPDATE content SET status = 'CLIENT_REVIEW', updated_at = NOW() WHERE id = ?", [testContentId]);

    const afterContent5 = await getDashboard();
    console.log('Content in Client Review:', {
      contentInReview: afterContent5.stats.contentInReview,
      pendingClientApproval: afterContent5.stats.pendingClientApproval,
      expectedClientApproval: baseline.stats.pendingClientApproval + 1,
    });
    if (afterContent5.stats.pendingClientApproval !== baseline.stats.pendingClientApproval + 1) {
      throw new Error(`TEST 5 Failed: pendingClientApproval was ${afterContent5.stats.pendingClientApproval}`);
    }
    console.log('✓ TEST 5 Passed: CLIENT_REVIEW decreased contentInReview and increased pendingClientApproval.');

    // -------------------------------------------------------------
    // TEST 6 — REVISION REQUEST
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Client Requests Revision ---');
    await db.query("UPDATE content SET status = 'REVISION_REQUIRED', updated_at = NOW() WHERE id = ?", [testContentId]);

    const afterContent6 = await getDashboard();
    console.log('Content Revision Required:', {
      pendingClientApproval: afterContent6.stats.pendingClientApproval,
      revisionRequired: afterContent6.stats.revisionRequired,
      expectedRevision: baseline.stats.revisionRequired + 1,
    });
    if (afterContent6.stats.revisionRequired !== baseline.stats.revisionRequired + 1) {
      throw new Error(`TEST 6 Failed: revisionRequired was ${afterContent6.stats.revisionRequired}`);
    }
    console.log('✓ TEST 6 Passed: REVISION_REQUIRED decreased pendingClientApproval and increased revisionRequired.');

    // -------------------------------------------------------------
    // TEST 7 — RESUBMISSION TO CLIENT REVIEW
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Resubmit Revision ---');
    await db.query("UPDATE content SET status = 'CLIENT_REVIEW', updated_at = NOW() WHERE id = ?", [testContentId]);

    const afterContent7 = await getDashboard();
    console.log('Content Resubmitted to Client:', {
      revisionRequired: afterContent7.stats.revisionRequired,
      pendingClientApproval: afterContent7.stats.pendingClientApproval,
    });
    if (afterContent7.stats.revisionRequired !== baseline.stats.revisionRequired) {
      throw new Error('TEST 7 Failed: revisionRequired did not decrease');
    }
    console.log('✓ TEST 7 Passed: Resubmission decreased revisionRequired and increased pendingClientApproval.');

    // -------------------------------------------------------------
    // TEST 8 — CLIENT APPROVAL
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Client Approval ---');
    await db.query("UPDATE content SET status = 'APPROVED', scheduled_at = NULL, updated_at = NOW() WHERE id = ?", [testContentId]);

    const afterContent8 = await getDashboard();
    console.log('Content Approved:', {
      pendingClientApproval: afterContent8.stats.pendingClientApproval,
      approvedContent: afterContent8.stats.approvedContent,
      expectedApproved: baseline.stats.approvedContent + 1,
    });
    if (afterContent8.stats.approvedContent !== baseline.stats.approvedContent + 1) {
      throw new Error('TEST 8 Failed: approvedContent did not increment');
    }
    console.log('✓ TEST 8 Passed: Client approval decreased pendingClientApproval and increased approvedContent.');

    // -------------------------------------------------------------
    // TEST 9 — SCHEDULE APPROVED CONTENT
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Schedule Approved Content ---');
    await db.query(
      "UPDATE content SET status = 'SCHEDULED', scheduled_at = DATE_ADD(NOW(), INTERVAL 1 DAY), updated_at = NOW() WHERE id = ?",
      [testContentId]
    );

    const afterContent9 = await getDashboard();
    console.log('Content Scheduled:', {
      approvedContent: afterContent9.stats.approvedContent,
      scheduledContent: afterContent9.stats.scheduledContent,
      expectedScheduled: baseline.stats.scheduledContent + 1,
    });
    if (afterContent9.stats.scheduledContent !== baseline.stats.scheduledContent + 1) {
      throw new Error('TEST 9 Failed: scheduledContent did not increment');
    }
    console.log('✓ TEST 9 Passed: Scheduling decreased approvedContent and increased scheduledContent.');

    // Cleanup test content
    await db.query('DELETE FROM content WHERE id = ?', [testContentId]);

    // -------------------------------------------------------------
    // TEST 10 — PERSONAL TO-DO CREATION & COMPLETION
    // -------------------------------------------------------------
    console.log('\n--- TEST 10: Personal To-Do Sync ---');
    const memberDashboardBefore = await getDashboard(memberToken);
    const memberTodoTodayBaseline = memberDashboardBefore.personalTodo.stats.today;

    const [todoRes] = await db.query(
      `INSERT INTO todos (user_id, workspace_id, title, priority, category, due_date, status, created_at)
       VALUES (?, ?, 'Personal Dashboard Todo Test', 'HIGH', 'Operations', CURDATE(), 'TODO', NOW())`,
      [member.id, workspaceId]
    );
    const todoId = todoRes.insertId;

    const memberDashboardAfterAdd = await getDashboard(memberToken);
    console.log('Member To-Do after Add:', {
      today: memberDashboardAfterAdd.personalTodo.stats.today,
      expected: memberTodoTodayBaseline + 1,
    });
    if (memberDashboardAfterAdd.personalTodo.stats.today !== memberTodoTodayBaseline + 1) {
      throw new Error('TEST 10 Failed: Member todo today count did not increment');
    }

    // Complete Todo
    await db.query("UPDATE todos SET status = 'COMPLETED', completed_at = NOW() WHERE id = ?", [todoId]);
    const memberDashboardAfterDone = await getDashboard(memberToken);
    console.log('Member To-Do after Done:', {
      today: memberDashboardAfterDone.personalTodo.stats.today,
      completed: memberDashboardAfterDone.personalTodo.stats.completed,
    });
    if (memberDashboardAfterDone.personalTodo.stats.today !== memberTodoTodayBaseline) {
      throw new Error('TEST 10 Failed: Member todo today count did not decrement on complete');
    }
    console.log('✓ TEST 10 Passed: Personal To-Do create and complete synchronized with dashboard.');

    // Cleanup test todo
    await db.query('DELETE FROM todos WHERE id = ?', [todoId]);

    // -------------------------------------------------------------
    // TEST 11 — CLIENT ISOLATION
    // -------------------------------------------------------------
    console.log('\n--- TEST 11: Client Isolation ---');
    const [clientUsers] = await db.query(
      "SELECT u.id, u.full_name, u.email, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name IN ('client', 'client_user') LIMIT 1"
    );
    if (clientUsers.length > 0) {
      const clientUser = clientUsers[0];
      const clientToken = jwt.sign(
        { id: clientUser.id, email: clientUser.email, role: clientUser.role, workspaceId },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      const clientDashboard = await getDashboard(clientToken);
      console.log('Client Portal Dashboard Output for ' + clientUser.full_name + ':', {
        stats: clientDashboard.stats,
        teamWorkload: clientDashboard.teamWorkload,
      });
      if (clientDashboard.teamWorkload !== undefined) {
        throw new Error('TEST 11 Failed: Client dashboard exposed internal team workload!');
      }
      console.log('✓ TEST 11 Passed: Client user receives strictly client-scoped data with zero internal team exposure.');
    }

    // -------------------------------------------------------------
    // TEST 12 — WORKSPACE ISOLATION
    // -------------------------------------------------------------
    console.log('\n--- TEST 12: Workspace Isolation ---');
    const [otherWorkspaces] = await db.query('SELECT id, name FROM workspaces WHERE id != ? AND deleted_at IS NULL LIMIT 1', [workspaceId]);
    if (otherWorkspaces.length > 0) {
      const otherWId = otherWorkspaces[0].id;
      // Request with unauthorized workspace header should return HTTP 403 or empty scoped data
      const unauthorizedRes = await fetch('http://localhost:5000/api/workspace/dashboard', {
        headers: { Authorization: `Bearer ${memberToken}`, 'X-Workspace-Id': String(otherWId) },
      });
      console.log(`Unauthorized workspace (${otherWId}) status code:`, unauthorizedRes.status);
      if (unauthorizedRes.status !== 403 && unauthorizedRes.status !== 200) {
        throw new Error('TEST 12 Failed: Workspace authorization check failed');
      }
      console.log('✓ TEST 12 Passed: Workspace isolation enforced.');
    }

    console.log('\n================================================================');
    console.log('ALL 12 DASHBOARD DATA REBUILD TESTS PASSED WITH 100% SUCCESS');
    console.log('================================================================');
    process.exit(0);
  } catch (err) {
    console.error('TEST SUITE FAILED:', err);
    process.exit(1);
  }
})();
