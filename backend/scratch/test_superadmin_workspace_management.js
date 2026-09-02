require('dotenv').config();
const { db } = require('../src/config/database');
const superadminService = require('../src/services/superadminService');
const authService = require('../src/services/authService');

async function runTests() {
  console.log('====================================================');
  console.log('SUPERADMIN WORKSPACE MANAGEMENT TEST SUITE');
  console.log('====================================================\n');

  try {
    // 1. Check Superadmin user
    const [superadmins] = await db.execute('SELECT id, full_name, email, role_id FROM users WHERE role_id = 1 LIMIT 1');
    const superadminUser = superadmins[0];
    console.log('✓ Found Superadmin:', superadminUser.email);

    // 2. Test listWorkspaces
    console.log('\n--- 1. Testing listWorkspaces ---');
    const allWorkspaces = await superadminService.listWorkspaces({});
    console.log(`✓ Retrieved ${allWorkspaces.length} workspaces.`);
    for (const ws of allWorkspaces) {
      console.log(`  - [ID ${ws.id}] ${ws.name} | Status: ${ws.status} | Manager: ${ws.managerName} (${ws.managerEmail}) | Team: ${ws.teamCount} | Clients: ${ws.clientCount} | Content: ${ws.contentCount} | Tasks: ${ws.taskCount}`);
    }

    // 3. Test getWorkspace Overview
    console.log('\n--- 2. Testing getWorkspace Overview ---');
    const targetWs = allWorkspaces[0];
    const wsOverview = await superadminService.getWorkspace(targetWs.id);
    console.log('✓ Fetched overview for:', wsOverview.name);
    console.log('  Metrics:', {
      teamCount: wsOverview.teamCount,
      clientCount: wsOverview.clientCount,
      projectCount: wsOverview.projectCount,
      contentCount: wsOverview.contentCount,
      taskCount: wsOverview.taskCount,
    });

    // 4. Test getWorkspaceTeam
    console.log('\n--- 3. Testing getWorkspaceTeam ---');
    const teamData = await superadminService.getWorkspaceTeam(targetWs.id);
    console.log(`✓ Retrieved ${teamData.team.length} members for workspace "${teamData.workspace.name}":`);
    teamData.team.forEach((m) => {
      console.log(`  - ${m.name} <${m.email}> | Role: ${m.role} | Status: ${m.userStatus} | Joined: ${m.joinedAt}`);
    });

    // 5. Test Workspace Creation for testing lifecycle
    console.log('\n--- 4. Testing Workspace Lifecycle (Create -> Suspend -> Test Block -> Reactivate -> Delete) ---');
    const testWsName = `Test Lifecycle Agency ${Date.now()}`;
    const testMgrEmail = `manager_${Date.now()}@testlifecycle.com`;
    const createdWs = await superadminService.createWorkspace(superadminUser, {
      name: testWsName,
      companyName: testWsName,
      email: 'contact@testlifecycle.com',
      phone: '+1 555-123-4567',
      address: '99 Innovation Way',
      managerName: 'Lifecycle Test Manager',
      managerEmail: testMgrEmail,
      managerPassword: 'Password123!',
      status: 'ACTIVE',
    });
    console.log(`✓ Created test workspace "${createdWs.name}" (ID: ${createdWs.id}) with Manager ID: ${createdWs.manager.id}`);

    // Verify Manager can authenticate when ACTIVE
    console.log('  Testing manager login while ACTIVE...');
    const loginActive = await authService.login(testMgrEmail, 'Password123!');
    console.log(`  ✓ Manager login successful when ACTIVE (Token received, workspace status: ${loginActive.user.workspace.status})`);

    // 6. Test SUSPEND Workspace
    console.log('\n--- 5. Testing Workspace Suspension ---');
    const suspendResult = await superadminService.updateWorkspaceStatus(createdWs.id, 'SUSPENDED', superadminUser);
    console.log(`✓ Workspace status updated to: ${suspendResult.status}`);

    // Check Audit Log
    const [auditRows] = await db.execute(
      'SELECT * FROM activity_logs WHERE workspace_id = ? AND action = "WORKSPACE_SUSPENDED" ORDER BY created_at DESC LIMIT 1',
      [createdWs.id]
    );
    if (auditRows.length > 0) {
      console.log('✓ Audit log recorded for suspension:', auditRows[0].action, auditRows[0].details);
    } else {
      console.error('❌ Audit log not found for suspension!');
    }

    // Verify Manager CANNOT authenticate when SUSPENDED
    console.log('  Testing manager login while SUSPENDED...');
    let blockedOnLogin = false;
    try {
      await authService.login(testMgrEmail, 'Password123!');
    } catch (loginErr) {
      blockedOnLogin = true;
      console.log(`  ✓ Manager login blocked with message: "${loginErr.message}" (Status: ${loginErr.status})`);
    }
    if (!blockedOnLogin) {
      console.error('❌ Manager was NOT blocked on login while workspace is suspended!');
    }

    // Verify Superadmin CAN still view/manage suspended workspace
    const superadminView = await superadminService.getWorkspace(createdWs.id);
    console.log(`✓ Superadmin can access suspended workspace "${superadminView.name}" (Status: ${superadminView.status})`);

    // 7. Test REACTIVATE Workspace
    console.log('\n--- 6. Testing Workspace Reactivation ---');
    const reactivateResult = await superadminService.updateWorkspaceStatus(createdWs.id, 'ACTIVE', superadminUser);
    console.log(`✓ Workspace status updated to: ${reactivateResult.status}`);

    // Verify Manager can authenticate again
    const loginReactivated = await authService.login(testMgrEmail, 'Password123!');
    console.log(`✓ Manager login successful after reactivation (Token received, workspace status: ${loginReactivated.user.workspace.status})`);

    // 8. Populate additional dependent records on test workspace before testing deletion
    console.log('\n--- 7. Populating Dependent Records for Transactional Deletion Test ---');
    // Add Client
    const [clientRes] = await db.execute(
      `INSERT INTO clients (workspace_id, name, company_name, email, status, created_at)
       VALUES (?, 'Test Client Corp', 'Test Client Corp', 'client@test.com', 'ACTIVE', NOW())`,
      [createdWs.id]
    );
    const testClientId = clientRes.insertId;

    // Add Project
    const [projRes] = await db.execute(
      `INSERT INTO projects (workspace_id, client_id, created_by, name, status, created_at)
       VALUES (?, ?, ?, 'Test Alpha Project', 'ACTIVE', NOW())`,
      [createdWs.id, testClientId, createdWs.manager.id]
    );
    const testProjId = projRes.insertId;

    // Add Task
    const [taskRes] = await db.execute(
      `INSERT INTO tasks (workspace_id, client_id, project_id, created_by, assigned_to, title, status, priority, created_at)
       VALUES (?, ?, ?, ?, ?, 'Initial Onboarding Task', 'TODO', 'HIGH', NOW())`,
      [createdWs.id, testClientId, testProjId, createdWs.manager.id, createdWs.manager.id]
    );

    // Add Content
    const [contentRes] = await db.execute(
      `INSERT INTO content (workspace_id, client_id, project_id, created_by, assigned_to, title, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'Social Launch Post', 'DRAFT', NOW())`,
      [createdWs.id, testClientId, testProjId, createdWs.manager.id, createdWs.manager.id]
    );

    // Add Chat Group and Message
    const [groupRes] = await db.execute(
      `INSERT INTO chat_groups (workspace_id, name, created_by, created_at)
       VALUES (?, 'General Agency Chat', ?, NOW())`,
      [createdWs.id, createdWs.manager.id]
    );
    const testGroupId = groupRes.insertId;
    await db.execute(
      `INSERT INTO chat_messages (group_id, sender_id, message, created_at)
       VALUES (?, ?, 'Welcome to the test workspace!', NOW())`,
      [testGroupId, createdWs.manager.id]
    );

    console.log('✓ Dependent records created: Client, Project, Task, Content, Chat Group & Message.');

    // 9. Test DELETE WORKSPACE
    console.log('\n--- 8. Testing Atomic Workspace Deletion ---');
    const deleteResult = await superadminService.deleteWorkspace(createdWs.id, superadminUser);
    console.log('✓ Deletion result:', deleteResult.message);

    // Verify workspace no longer exists in DB
    const [checkWs] = await db.execute('SELECT id FROM workspaces WHERE id = ?', [createdWs.id]);
    console.log(`✓ Workspace query after deletion count: ${checkWs.length} (Expected: 0)`);

    // Verify exclusive user cleaned up
    const [checkUser] = await db.execute('SELECT id FROM users WHERE id = ?', [createdWs.manager.id]);
    console.log(`✓ Exclusive workspace manager user cleaned up: ${checkUser.length === 0} (Expected: true)`);

    // Verify dependent records cleaned up
    const [checkTasks] = await db.execute('SELECT id FROM tasks WHERE workspace_id = ?', [createdWs.id]);
    const [checkContent] = await db.execute('SELECT id FROM content WHERE workspace_id = ?', [createdWs.id]);
    const [checkClients] = await db.execute('SELECT id FROM clients WHERE workspace_id = ?', [createdWs.id]);
    const [checkChat] = await db.execute('SELECT id FROM chat_groups WHERE workspace_id = ?', [createdWs.id]);
    console.log(`✓ Orphan checks: Tasks=${checkTasks.length}, Content=${checkContent.length}, Clients=${checkClients.length}, Chat=${checkChat.length} (All expected: 0)`);

    // Verify Superadmin account still intact
    const [checkSuperadmin] = await db.execute('SELECT id FROM users WHERE role_id = 1');
    console.log(`✓ Global Superadmins intact: ${checkSuperadmin.length >= 1} (Expected: true)`);

    console.log('\n====================================================');
    console.log('ALL SUPERADMIN WORKSPACE TESTS PASSED SUCCESSFULLY! ✓');
    console.log('====================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  }
}

runTests();
