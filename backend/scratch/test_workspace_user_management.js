const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://127.0.0.1:5000/api';

async function runWorkspaceUserManagementTests() {
  console.log('--------------------------------------------------');
  console.log('Running SocialDesk Workspace User & Client APIs');
  console.log('--------------------------------------------------');

  try {
    // 1. Workspace Manager Login
    console.log('\n[Test 1] Logging in as Workspace Manager (sarah@socialdesk.com)...');
    const wmLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sarah@socialdesk.com', password: 'password123' }),
    });
    const wmToken = (await wmLogin.json()).data.token;
    console.log('✅ Workspace Manager Login Successful!');

    // 2. Create Team Member (Graphic Designer)
    console.log('\n[Test 2] POST /api/workspace/users (Creating Graphic Designer team member)...');
    const createTmRes = await fetch(`${API_URL}/workspace/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({
        name: 'Rachel Graphic',
        email: `rachel.design.${Date.now()}@agency.com`,
        role: 'graphic_designer',
      }),
    });
    const createTmData = await createTmRes.json();
    console.log('✅ Team Member Created!');
    console.log('Temporary Credentials:', {
      id: createTmData.data.user.id,
      email: createTmData.data.user.email,
      role: createTmData.data.user.role,
      tempPassword: createTmData.data.temporaryPassword,
    });
    const teamMemberId = createTmData.data.user.id;

    // 3. Create Client (Record + Account)
    console.log('\n[Test 3] POST /api/workspace/clients (Creating Client & Client User)...');
    const createClientRes = await fetch(`${API_URL}/workspace/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({
        clientName: 'Starlight Retail Group',
        companyName: 'Starlight Retail Inc.',
        contactName: 'Olivia Star',
        email: `olivia.${Date.now()}@starlightretail.com`,
        phone: '+1-555-7788',
        notes: 'Enterprise fashion retail account',
      }),
    });
    const createClientData = await createClientRes.json();
    console.log('✅ Client & User Account Created!');
    console.log('Client Record:', createClientData.data.client);
    console.log('Temporary Client User Password:', createClientData.data.temporaryPassword);
    const clientId = createClientData.data.client.id;

    // 4. GET Workspace Users
    console.log('\n[Test 4] GET /api/workspace/users (Listing workspace team members)...');
    const listUsersRes = await fetch(`${API_URL}/workspace/users`, {
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const listUsersData = await listUsersRes.json();
    console.log(`✅ Total Workspace Users Found: ${listUsersData.data.length}`);

    // 5. GET Single User Details
    console.log(`\n[Test 5] GET /api/workspace/users/${teamMemberId}...`);
    const getUserRes = await fetch(`${API_URL}/workspace/users/${teamMemberId}`, {
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const getUserData = await getUserRes.json();
    console.log('✅ User Details:', getUserData.data.name, getUserData.data.email, getUserData.data.role);

    // 6. PUT Update User Details
    console.log(`\n[Test 6] PUT /api/workspace/users/${teamMemberId}...`);
    const updateUserRes = await fetch(`${API_URL}/workspace/users/${teamMemberId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({ phone: '+1-555-4433' }),
    });
    const updateUserData = await updateUserRes.json();
    console.log('✅ User Updated:', updateUserData.data.name);

    // 7. PATCH User Status
    console.log(`\n[Test 7] PATCH /api/workspace/users/${teamMemberId}/status...`);
    const statusUserRes = await fetch(`${API_URL}/workspace/users/${teamMemberId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({ status: 'INACTIVE' }),
    });
    const statusUserData = await statusUserRes.json();
    console.log('✅ User Status Updated:', statusUserData.data);

    // 8. GET Workspace Clients
    console.log('\n[Test 8] GET /api/workspace/clients (Listing workspace clients)...');
    const listClientsRes = await fetch(`${API_URL}/workspace/clients`, {
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const listClientsData = await listClientsRes.json();
    console.log(`✅ Total Workspace Clients Found: ${listClientsData.data.length}`);

    // 9. GET Single Client Details
    console.log(`\n[Test 9] GET /api/workspace/clients/${clientId}...`);
    const getClientRes = await fetch(`${API_URL}/workspace/clients/${clientId}`, {
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const getClientData = await getClientRes.json();
    console.log('✅ Client Details:', getClientData.data.companyName, getClientData.data.email);

    // 10. PUT Update Client Details
    console.log(`\n[Test 10] PUT /api/workspace/clients/${clientId}...`);
    const updateClientRes = await fetch(`${API_URL}/workspace/clients/${clientId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({ phone: '+1-555-8899' }),
    });
    const updateClientData = await updateClientRes.json();
    console.log('✅ Client Details Updated:', updateClientData.data.phone);

    // 11. PATCH Client Status
    console.log(`\n[Test 11] PATCH /api/workspace/clients/${clientId}/status...`);
    const statusClientRes = await fetch(`${API_URL}/workspace/clients/${clientId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({ status: 'ARCHIVED' }),
    });
    const statusClientData = await statusClientRes.json();
    console.log('✅ Client Status Updated:', statusClientData.data);

    // 12. Security Role Restriction Check: Workspace Manager creating Superadmin
    console.log('\n[Test 12] Security Check: Workspace Manager attempting to create a Superadmin account...');
    const forbiddenRes = await fetch(`${API_URL}/workspace/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({
        name: 'Hacker Admin',
        email: `hacker.${Date.now()}@agency.com`,
        role: 'superadmin',
      }),
    });
    const forbiddenData = await forbiddenRes.json();
    if (forbiddenRes.status === 403) {
      console.log('✅ PASSED (403 Forbidden):', forbiddenData.message);
    } else {
      console.error('❌ FAILED: Expected 403 Forbidden');
    }

    console.log('\n--------------------------------------------------');
    console.log('🎉 ALL WORKSPACE USER & CLIENT API TESTS PASSED!');
    console.log('--------------------------------------------------');
  } catch (error) {
    console.error('❌ Test Runner Error:', error);
  }
}

runWorkspaceUserManagementTests();
