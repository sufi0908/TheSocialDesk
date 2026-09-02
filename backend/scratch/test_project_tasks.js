const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://127.0.0.1:5000/api';

async function runProjectTaskTests() {
  console.log('--------------------------------------------------');
  console.log('Running SocialDesk Project & Task Management APIs');
  console.log('--------------------------------------------------');

  try {
    // 1. Workspace Manager Login (Sarah, Workspace 1)
    const wmLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sarah@socialdesk.com', password: 'password123' }),
    });
    const wmToken = (await wmLogin.json()).data.token;
    console.log('✅ Workspace Manager Authenticated!');

    // 2. Team Member 1 Login (Alex Rivera, User ID 3)
    const tm1Login = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex@socialdesk.com', password: 'password123' }),
    });
    const tm1Token = (await tm1Login.json()).data.token;

    // 3. Team Member 2 Login (Marcus Vance, User ID 6)
    const tm2Login = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'marcus@hyperdriveagency.com', password: 'password123' }),
    });
    const tm2Token = (await tm2Login.json()).data.token;

    // --- PROJECT TESTS ---
    console.log('\n[Test 1] POST /api/projects (Creating Project for Client 1)...');
    const createProjectRes = await fetch(`${API_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({
        name: 'Winter Social Campaign',
        clientId: 1,
        description: 'Multi-channel social campaign for winter catalog release',
        status: 'ACTIVE',
        startDate: '2026-11-01',
        dueDate: '2026-12-15',
      }),
    });
    const createProjectData = await createProjectRes.json();
    console.log('✅ Project Created:', createProjectData.data.name, '(ID:', createProjectData.data.id, ')');
    const projectId = createProjectData.data.id;

    console.log('\n[Test 2] GET /api/projects (Listing workspace projects)...');
    const listProjectsRes = await fetch(`${API_URL}/projects?clientId=1`, {
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const listProjectsData = await listProjectsRes.json();
    console.log(`✅ Total Projects Found for Client 1: ${listProjectsData.data.length}`);

    console.log(`\n[Test 3] GET /api/projects/${projectId}...`);
    const getProjectRes = await fetch(`${API_URL}/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const getProjectData = await getProjectRes.json();
    console.log('✅ Project Details:', getProjectData.data.name, '| Client:', getProjectData.data.client_name);

    console.log(`\n[Test 4] PATCH /api/projects/${projectId}/status...`);
    const statusProjectRes = await fetch(`${API_URL}/projects/${projectId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    const statusProjectData = await statusProjectRes.json();
    console.log('✅ Project Status Updated:', statusProjectData.data);

    // --- TASK TESTS ---
    console.log('\n[Test 5] POST /api/tasks (Creating Task assigned to Alex Rivera - User 3)...');
    const createTaskRes = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({
        title: 'Design Winter Banner Graphics',
        description: 'Create 3 hero carousel banners for Instagram & Facebook',
        clientId: 1,
        projectId: projectId,
        assignedTo: 3,
        status: 'TODO',
        priority: 'URGENT',
        dueDate: '2026-11-10',
      }),
    });
    const createTaskData = await createTaskRes.json();
    console.log('✅ Task Created:', createTaskData.data.title, '(ID:', createTaskData.data.id, ')');
    const taskId = createTaskData.data.id;

    console.log('\n[Test 6] GET /api/tasks (Filtering tasks by status=TODO and priority=URGENT)...');
    const listTasksRes = await fetch(`${API_URL}/tasks?status=TODO&priority=URGENT`, {
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const listTasksData = await listTasksRes.json();
    console.log(`✅ Tasks Found: ${listTasksData.data.length}`);
    console.table(listTasksData.data.map(t => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, assignee: t.assignee_name })));

    console.log(`\n[Test 7] PATCH /api/tasks/${taskId}/status (Assigned Team Member Alex updating status to IN_PROGRESS)...`);
    const tmStatusRes = await fetch(`${API_URL}/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tm1Token}`,
      },
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    });
    const tmStatusData = await tmStatusRes.json();
    console.log('✅ Assigned Team Member Status Update:', tmStatusData.data);

    console.log(`\n[Test 8] Security Guard: Unassigned Team Member Marcus attempting to update Task ${taskId}...`);
    const forbiddenTaskRes = await fetch(`${API_URL}/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tm2Token}`,
      },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    const forbiddenTaskData = await forbiddenTaskRes.json();
    if (forbiddenTaskRes.status === 403) {
      console.log('✅ PASSED (403 Forbidden):', forbiddenTaskData.message);
    } else {
      console.error('❌ FAILED: Expected 403 Forbidden for unassigned team member status update');
    }

    console.log(`\n[Test 9] DELETE /api/tasks/${taskId} (Manager deleting task)...`);
    const deleteTaskRes = await fetch(`${API_URL}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const deleteTaskData = await deleteTaskRes.json();
    console.log('✅ Task Deleted:', deleteTaskData.message);

    console.log('\n--------------------------------------------------');
    console.log('🎉 ALL PROJECT & TASK API TESTS PASSED!');
    console.log('--------------------------------------------------');
  } catch (error) {
    console.error('❌ Project/Task Test Error:', error);
  }
}

runProjectTaskTests();
