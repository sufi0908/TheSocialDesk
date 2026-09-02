require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { db } = require('../src/config/database');
const jwt = require('jsonwebtoken');

const API_BASE = 'http://localhost:5000/api';

async function runReportTests() {
  console.log('============================================================');
  console.log('SOCIALDESK AGENCY REPORTS SYSTEM AUTOMATED TEST SUITE');
  console.log('============================================================');

  // 1. Generate JWT Token for Workspace Manager (Farhan, ID 14, Workspace 4)
  const token = jwt.sign(
    { id: 14, email: 'farhan@optiwisesolutions.com', role: 'workspace_manager' },
    process.env.JWT_SECRET || 'fallback-secret-key-for-development-only',
    { expiresIn: '1h' }
  );
  console.log('✅ Generated JWT token for Workspace Manager (Farhan, Workspace 4)');

  const headers = {
    'Authorization': `Bearer ${token}`,
    'x-workspace-id': '4',
    'Content-Type': 'application/json',
  };

  // TEST 1: Full Reports Payload
  console.log('\n[TEST 1] Querying GET /api/workspace/reports (All Time)...');
  const res1 = await fetch(`${API_BASE}/workspace/reports?dateRange=All`, { headers });
  if (res1.status !== 200) {
    throw new Error(`Test 1 Failed: Expected status 200, got ${res1.status}`);
  }
  const json1 = await res1.json();
  if (!json1.success || !json1.data) {
    throw new Error('Test 1 Failed: Response success is not true or data is missing');
  }
  console.log('✅ Full Reports API Success: true');
  console.log('   - Total Tasks Tracked:', json1.data.overview.totalTasks);
  console.log('   - Completed Tasks:', json1.data.overview.completedTasks);
  console.log('   - Pending Tasks:', json1.data.overview.pendingTasks);
  console.log('   - Total Content Items:', json1.data.overview.totalContent);
  console.log('   - Team Members in Workload Table:', json1.data.teamWorkload.length);
  console.log('   - Clients in Summary Table:', json1.data.clientWorkSummary.length);

  // TEST 2: Workspace Isolation
  console.log('\n[TEST 2] Testing Workspace Isolation (Unauthorized Workspace Access)...');
  const res2 = await fetch(`${API_BASE}/workspace/reports`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-workspace-id': '9999', // Unauthorized workspace ID
    },
  });
  console.log(`✅ Unauthorized workspace request returned HTTP ${res2.status} (Expected 403)`);
  if (res2.status !== 403) {
    throw new Error(`Test 2 Failed: Expected 403 Forbidden for unauthorized workspace, got ${res2.status}`);
  }

  // TEST 3: Client Filter Verification
  console.log('\n[TEST 3] Testing Client Filter (Client ID 7 - Rida Asad)...');
  const res3 = await fetch(`${API_BASE}/workspace/reports?dateRange=All&clientId=7`, { headers });
  const json3 = await res3.json();
  console.log('✅ Client Filtered Total Tasks:', json3.data.overview.totalTasks);
  console.log('✅ Client Filtered Content Items:', json3.data.overview.totalContent);
  if (json3.data.clientWorkSummary.length !== 1 || json3.data.clientWorkSummary[0].clientId !== 7) {
    throw new Error('Test 3 Failed: Client summary did not strictly filter to Client ID 7');
  }
  console.log('✅ Client Work Summary strictly contains only Client 7 (Rida Asad)');

  // TEST 4: Team Member Filter Verification
  console.log('\n[TEST 4] Testing Team Member Filter (User 18 - Abu Sufyan)...');
  const res4 = await fetch(`${API_BASE}/workspace/reports?dateRange=All&teamMemberId=18`, { headers });
  const json4 = await res4.json();
  const sufyanWorkload = json4.data.teamWorkload;
  console.log('✅ Team Member Filter returned team members count:', sufyanWorkload.length);
  if (sufyanWorkload.length !== 1 || sufyanWorkload[0].id !== 18) {
    throw new Error('Test 4 Failed: Workload list did not strictly filter to User 18 (Abu Sufyan)');
  }
  console.log(`✅ Abu Sufyan Workload: Assigned=${sufyanWorkload[0].assignedTasks}, Completed=${sufyanWorkload[0].completedTasks}, Pending=${sufyanWorkload[0].pendingTasks}`);

  // TEST 5: Status Filter Verification
  console.log('\n[TEST 5] Testing Work Status Filter (Completed Tasks Only)...');
  const res5 = await fetch(`${API_BASE}/workspace/reports?dateRange=All&status=Completed`, { headers });
  const json5 = await res5.json();
  console.log('✅ Completed Tasks in Overview:', json5.data.overview.completedTasks);
  console.log('✅ Total Tasks matching filter:', json5.data.overview.totalTasks);
  if (json5.data.overview.totalTasks !== json5.data.overview.completedTasks) {
    throw new Error('Test 5 Failed: Total tasks does not match completed tasks when filtering for Completed status');
  }

  // TEST 6: Direct Database Comparison for Abu Sufyan (User 18)
  console.log('\n[TEST 6] Direct Database Audit: Comparing Abu Sufyan (User 18) Task Counts...');
  const [directSufyanTasks] = await db.query(
    'SELECT COUNT(*) as total, COUNT(CASE WHEN status = "COMPLETED" THEN 1 END) as completed FROM tasks WHERE workspace_id = 4 AND assigned_to = 18 AND deleted_at IS NULL'
  );
  const directTotal = Number(directSufyanTasks[0].total);
  const directCompleted = Number(directSufyanTasks[0].completed);

  const apiSufyan = json1.data.teamWorkload.find((m) => m.id === 18);
  console.log(`   - MySQL Direct: Assigned=${directTotal}, Completed=${directCompleted}`);
  console.log(`   - Reports API:  Assigned=${apiSufyan.assignedTasks}, Completed=${apiSufyan.completedTasks}`);
  if (directTotal !== apiSufyan.assignedTasks || directCompleted !== apiSufyan.completedTasks) {
    throw new Error('Test 6 Failed: Discrepancy between Direct MySQL count and Reports API for Abu Sufyan!');
  }
  console.log('✅ Direct MySQL and Reports API match 100% for Abu Sufyan (User 18)');

  // TEST 7: Direct Database Comparison for Ch Faisal (User 16)
  console.log('\n[TEST 7] Direct Database Audit: Comparing Ch Faisal (User 16) Task Counts...');
  const [directFaisalTasks] = await db.query(
    'SELECT COUNT(*) as total, COUNT(CASE WHEN status = "COMPLETED" THEN 1 END) as completed, COUNT(CASE WHEN status NOT IN ("COMPLETED", "CANCELLED") THEN 1 END) as pending FROM tasks WHERE workspace_id = 4 AND assigned_to = 16 AND deleted_at IS NULL'
  );
  const directFaisalTotal = Number(directFaisalTasks[0].total);
  const directFaisalPending = Number(directFaisalTasks[0].pending);

  const apiFaisal = json1.data.teamWorkload.find((m) => m.id === 16);
  console.log(`   - MySQL Direct: Assigned=${directFaisalTotal}, Pending=${directFaisalPending}`);
  console.log(`   - Reports API:  Assigned=${apiFaisal.assignedTasks}, Pending=${apiFaisal.pendingTasks}`);
  if (directFaisalTotal !== apiFaisal.assignedTasks || directFaisalPending !== apiFaisal.pendingTasks) {
    throw new Error('Test 7 Failed: Discrepancy between Direct MySQL count and Reports API for Ch Faisal!');
  }
  console.log('✅ Direct MySQL and Reports API match 100% for Ch Faisal (User 16)');

  // TEST 8: Direct Database Comparison for Total Content in Workspace 4
  console.log('\n[TEST 8] Direct Database Audit: Comparing Content Counts...');
  const [directContent] = await db.query(
    'SELECT COUNT(*) as count FROM content WHERE workspace_id = 4 AND deleted_at IS NULL'
  );
  const directContentCount = Number(directContent[0].count);
  console.log(`   - MySQL Direct: Total Content=${directContentCount}`);
  console.log(`   - Reports API:  Total Content=${json1.data.overview.totalContent}`);
  if (directContentCount !== json1.data.overview.totalContent) {
    throw new Error('Test 8 Failed: Discrepancy between Direct MySQL content count and Reports API!');
  }
  console.log('✅ Direct MySQL and Reports API match 100% for Content');

  // TEST 9: Sub-resource Endpoints
  console.log('\n[TEST 9] Testing Sub-Resource Endpoints...');
  const endpoints = [
    'overview',
    'team-workload',
    'project-progress',
    'task-completion',
    'content-status',
    'approval-status',
    'deadline-status',
    'client-summary',
  ];
  for (const ep of endpoints) {
    const res = await fetch(`${API_BASE}/workspace/reports/${ep}`, { headers });
    if (res.status !== 200) {
      throw new Error(`Sub-endpoint /reports/${ep} returned status ${res.status}`);
    }
    const json = await res.json();
    if (!json.success) {
      throw new Error(`Sub-endpoint /reports/${ep} success was false`);
    }
    console.log(`   - GET /api/workspace/reports/${ep} -> 200 OK`);
  }
  console.log('✅ All 8 sub-resource endpoints verified successfully!');

  console.log('\n============================================================');
  console.log('🎉 ALL 9 REPORTS AUDIT, CALCULATION & ISOLATION TESTS PASSED!');
  console.log('============================================================\n');

  process.exit(0);
}

runReportTests().catch((err) => {
  console.error('\n❌ TEST RUNNER ERROR:', err);
  process.exit(1);
});
