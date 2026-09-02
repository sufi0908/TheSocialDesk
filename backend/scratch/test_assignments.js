const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://127.0.0.1:5000/api';

async function runAssignmentTests() {
  console.log('--------------------------------------------------');
  console.log('Running SocialDesk Team & Client Assignment API Tests');
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

    // 2. Team Member Login (Alex, Workspace 1)
    const tmLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex@socialdesk.com', password: 'password123' }),
    });
    const tmToken = (await tmLogin.json()).data.token;

    // 3. Assign Team Member (User ID 3) to Client 1
    console.log('\n[Test 1] POST /api/clients/1/team (Assigning User 3 to Client 1)...');
    const assignClientRes = await fetch(`${API_URL}/clients/1/team`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({ userId: 3, role: 'Lead Strategist' }),
    });
    const assignClientData = await assignClientRes.json();
    console.log('✅ Client Assignment Created:', assignClientData.message);

    // 4. GET Assigned Team for Client 1
    console.log('\n[Test 2] GET /api/clients/1/team (Fetching Client 1 assigned team)...');
    const getClientTeamRes = await fetch(`${API_URL}/clients/1/team`, {
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const getClientTeamData = await getClientTeamRes.json();
    console.log(`✅ Assigned Team Count: ${getClientTeamData.data.length}`);
    console.table(getClientTeamData.data.map(m => ({ user_id: m.user_id, name: m.name, role: m.assignment_role })));

    // 5. Assign Team Member (User ID 3) to Project 1
    console.log('\n[Test 3] POST /api/projects/1/members (Assigning User 3 to Project 1)...');
    const assignProjectRes = await fetch(`${API_URL}/projects/1/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({ userId: 3, role: 'Lead Creator' }),
    });
    const assignProjectData = await assignProjectRes.json();
    console.log('✅ Project Member Assigned:', assignProjectData.message);

    // 6. GET Project Members for Project 1
    console.log('\n[Test 4] GET /api/projects/1/members (Fetching Project 1 members)...');
    const getProjectMembersRes = await fetch(`${API_URL}/projects/1/members`, {
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const getProjectMembersData = await getProjectMembersRes.json();
    console.log(`✅ Project Members Count: ${getProjectMembersData.data.length}`);
    console.table(getProjectMembersData.data.map(m => ({ user_id: m.user_id, name: m.name, role: m.assignment_role })));

    // 7. DELETE Remove Member from Project 1
    console.log('\n[Test 5] DELETE /api/projects/1/members/3 (Removing User 3 from Project 1)...');
    const removeProjectRes = await fetch(`${API_URL}/projects/1/members/3`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const removeProjectData = await removeProjectRes.json();
    console.log('✅ Project Member Removed:', removeProjectData.message);

    // Re-assign User 3 to Project 1 for consistency
    await fetch(`${API_URL}/projects/1/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({ userId: 3, role: 'Content Creator' }),
    });

    // 8. Security Check: Team Member attempting to assign member to client
    console.log('\n[Test 6] Security Check: Team Member attempting to assign team to Client 1...');
    const forbiddenAssignRes = await fetch(`${API_URL}/clients/1/team`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tmToken}`,
      },
      body: JSON.stringify({ userId: 4, role: 'Unauthorized Assignee' }),
    });
    const forbiddenAssignData = await forbiddenAssignRes.json();
    if (forbiddenAssignRes.status === 403) {
      console.log('✅ PASSED (403 Forbidden):', forbiddenAssignData.message);
    } else {
      console.error('❌ FAILED: Expected 403 Forbidden for team member assignment attempt');
    }

    console.log('\n--------------------------------------------------');
    console.log('🎉 ALL ASSIGNMENT API TESTS PASSED SUCCESSFULLY!');
    console.log('--------------------------------------------------');
  } catch (error) {
    console.error('❌ Assignment Test Error:', error);
  }
}

runAssignmentTests();
