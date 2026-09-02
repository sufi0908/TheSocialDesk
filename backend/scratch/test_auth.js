const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://127.0.0.1:5000/api';

async function runAuthTests() {
  console.log('--------------------------------------------------');
  console.log('Running SocialDesk Controlled Authentication Tests...');
  console.log('--------------------------------------------------');

  try {
    // 1. Superadmin Login
    console.log('\n[Test 1] Logging in as Superadmin (admin@socialdesk.com)...');
    const adminLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@socialdesk.com', password: 'password123' }),
    });
    const adminLoginData = await adminLoginRes.json();
    console.log('✅ Superadmin Login Successful!');
    const adminToken = adminLoginData.data.token;

    // 2. Superadmin creates a new Workspace Manager
    console.log('\n[Test 2] Superadmin creating a new Workspace Manager with temporary password...');
    const createWmRes = await fetch(`${API_URL}/users/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        fullName: 'Jane Manager',
        email: `jane.manager.${Date.now()}@agency.com`,
        roleName: 'workspace_manager',
        workspaceId: 1,
      }),
    });
    const createWmData = await createWmRes.json();
    console.log('✅ Workspace Manager Created!');
    console.log('Temporary Credentials:', {
      email: createWmData.data.user.email,
      tempPassword: createWmData.data.temporaryPassword,
      mustChangePassword: createWmData.data.user.mustChangePassword,
    });

    const newWmEmail = createWmData.data.user.email;
    const tempPassword = createWmData.data.temporaryPassword;

    // 3. New Workspace Manager Login with Temporary Password
    console.log('\n[Test 3] Logging in as new Workspace Manager using Temporary Password...');
    const wmLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newWmEmail, password: tempPassword }),
    });
    const wmLoginData = await wmLoginRes.json();
    console.log('✅ Temporary Password Login Successful!');
    console.log('User mustChangePassword status:', wmLoginData.data.user.mustChangePassword);
    if (wmLoginData.data.user.mustChangePassword !== true) {
      throw new Error('Expected mustChangePassword to be true for temporary password user');
    }

    const wmToken = wmLoginData.data.token;

    // 4. Force Password Change for new Workspace Manager
    console.log('\n[Test 4] Executing password change for new Workspace Manager...');
    const changePwdRes = await fetch(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({
        currentPassword: tempPassword,
        newPassword: 'MyNewPermanentPassword123!',
        confirmNewPassword: 'MyNewPermanentPassword123!',
      }),
    });
    const changePwdData = await changePwdRes.json();
    console.log('✅ Password Changed:', changePwdData.message);

    // 5. Verify mustChangePassword is now false
    console.log('\n[Test 5] Verifying mustChangePassword status after password update...');
    const meRes = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const meData = await meRes.json();
    console.log('✅ Current User mustChangePassword:', meData.data.mustChangePassword);
    if (meData.data.mustChangePassword !== false) {
      throw new Error('Expected mustChangePassword to be false after password change');
    }

    // 6. Workspace Manager creating a Content Creator account
    console.log('\n[Test 6] Workspace Manager creating a Content Writer user account...');
    const createWriterRes = await fetch(`${API_URL}/users/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({
        fullName: 'Carl Writer',
        email: `carl.writer.${Date.now()}@agency.com`,
        roleName: 'content_writer',
      }),
    });
    const createWriterData = await createWriterRes.json();
    console.log('✅ Content Writer Created:', createWriterData.data.user);

    // 7. Workspace Manager attempting to create a Superadmin (Permission Rejection Check)
    console.log('\n[Test 7] Verifying Workspace Manager CANNOT create a Superadmin account...');
    const invalidCreateRes = await fetch(`${API_URL}/users/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({
        fullName: 'Hacker Admin',
        email: `hacker.${Date.now()}@agency.com`,
        roleName: 'superadmin',
      }),
    });
    const invalidCreateData = await invalidCreateRes.json();
    if (invalidCreateRes.status === 403) {
      console.log('✅ Passed (403 Forbidden):', invalidCreateData.message);
    } else {
      throw new Error('Expected 403 Forbidden when Workspace Manager tries to create a Superadmin');
    }

    console.log('\n--------------------------------------------------');
    console.log('🎉 ALL CONTROLLED AUTHENTICATION TESTS PASSED!');
    console.log('--------------------------------------------------');
  } catch (error) {
    console.error('❌ Test Failed:', error);
  }
}

runAuthTests();
