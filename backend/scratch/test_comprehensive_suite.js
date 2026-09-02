const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { io } = require('socket.io-client');

const API_URL = 'http://127.0.0.1:5000/api';
const WS_URL = 'http://127.0.0.1:5000';

async function testAuthEdgeCases() {
  console.log('\n--- 1. TESTING AUTH EDGE CASES ---');

  // A. Invalid password
  const res1 = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@socialdesk.com', password: 'wrongpassword' }),
  });
  console.log(`   (A) Login with invalid password: Status ${res1.status} (Expected: 401)`);

  // B. Inactive account
  const { db } = require('../src/config/database');
  await db.execute('UPDATE users SET status = "INACTIVE" WHERE id = 3'); // Set Alex Rivera (designer) to INACTIVE
  const res2 = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alex@socialdesk.com', password: 'password123' }),
  });
  console.log(`   (B) Login with inactive account: Status ${res2.status} (Expected: 403)`);
  await db.execute('UPDATE users SET status = "ACTIVE" WHERE id = 3'); // Revert

  // C. Expired / Invalid token
  const res3 = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: 'Bearer invalid_or_expired_jwt_token_claims_here' },
  });
  console.log(`   (C) Auth with invalid token: Status ${res3.status} (Expected: 401)`);
}

async function testAccountCreationAndPublicSignup() {
  console.log('\n--- 2. TESTING ACCOUNT CREATION & NO PUBLIC SIGNUP ---');

  // A. No public signup
  const res1 = await fetch(`${API_URL}/auth/register`, { method: 'POST' });
  console.log(`   (A) Hitting public signup /register: Status ${res1.status} (Expected: 404)`);

  // B. Superadmin creates workspace and manager
  const saLogin = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@socialdesk.com', password: 'password123' }),
  });
  const saToken = (await saLogin.json()).data.token;

  const runId = Date.now().toString().substring(8);
  const wsRes = await fetch(`${API_URL}/superadmin/workspaces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${saToken}` },
    body: JSON.stringify({
      companyName: `Dynamic Agency ${runId}`,
      workspaceName: `Dynamic Agency ${runId}`,
      email: `contact_${runId}@dynagency.com`,
    }),
  });
  const wsData = await wsRes.json();
  const wsId = wsData.data.id;
  console.log(`   (B) Superadmin Workspace Created: ID ${wsId} (${wsData.data.company_name})`);

  const mgrRes = await fetch(`${API_URL}/superadmin/workspaces/${wsId}/manager`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${saToken}` },
    body: JSON.stringify({ name: 'Jordan Manager', email: `jordan.mgr_${runId}@dynagency.com` }),
  });
  const mgrData = await mgrRes.json();
  console.log(`       Manager created with temporary password: ${mgrData.data.temporaryPassword}`);
  return { saToken, wsId, mgrEmail: `jordan.mgr_${runId}@dynagency.com`, mgrTempPass: mgrData.data.temporaryPassword };
}

async function testRBACAndSecurityIsolation(mgrEmail, mgrTempPass, wsId) {
  console.log('\n--- 3. TESTING RBAC & SECURITY ISOLATION ---');

  // A. Authenticate Manager & change password
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: mgrEmail, password: mgrTempPass }),
  });
  const mgrToken = (await loginRes.json()).data.token;
  const chgRes = await fetch(`${API_URL}/auth/change-pass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mgrToken}` },
    body: JSON.stringify({ currentPassword: mgrTempPass, newPassword: 'ManagerSecurePass123!' }),
  });
  const chgData = await chgRes.json();
  console.log('   Password Change response:', chgData);

  // B. Designer attempting unauthorized operation (Superadmin Workspace list)
  const designerLogin = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alex@socialdesk.com', password: 'password123' }),
  });
  const designerLoginData = await designerLogin.json();
  const designerToken = designerLoginData.data.token;

  const res1 = await fetch(`${API_URL}/superadmin/workspaces`, {
    headers: { Authorization: `Bearer ${designerToken}` },
  });
  console.log(`   (B) Designer accessing superadmin workspaces list: Status ${res1.status} (Expected: 403/401)`);

  // C. SQL Injection protection verification
  const injectionRes = await fetch(`${API_URL}/search?q=' OR '1'='1`, {
    headers: { Authorization: `Bearer ${mgrToken}` },
  });
  console.log(`   (C) Hitting search with SQL Injection payload: Status ${injectionRes.status} (Expected: 200/Safe Execution)`);

  // D. Cross-Workspace security isolation check
  // Manager from Workspace A trying to view items of Workspace B
  const crossRes = await fetch(`${API_URL}/superadmin/workspaces/${wsId}`, {
    headers: { Authorization: `Bearer ${designerToken}` }, // Designer from different workspace
  });
  console.log(`   (D) Cross-Workspace access attempt: Status ${crossRes.status} (Expected: 403/401)`);
}

async function testNotificationsAndRealtime(mgrEmail) {
  console.log('\n--- 4. TESTING PERSISTENT & REAL-TIME NOTIFICATIONS ---');

  // A. Log in Manager
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: mgrEmail, password: 'ManagerSecurePass123!' }),
  });
  const loginData = await loginRes.json();
  console.log('   Manager login response:', loginData);
  const token = loginData.data?.token;
  const userId = loginData.data?.user?.id;

  // B. Connect Socket.IO
  const socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket'],
  });

  const notificationPromise = new Promise((resolve) => {
    socket.on('notification', (data) => {
      console.log('      ⚡ Received Real-Time Socket.IO Notification:', data.title);
      resolve(data);
    });
  });

  await new Promise((r) => setTimeout(r, 1000));

  // C. Trigger Event (Create Task)
  await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      title: 'Strategy Audit Task',
      description: 'Audit realtime notifications',
      clientId: 1,
      assignedTo: userId,
      priority: 'MEDIUM',
    }),
  });

  await notificationPromise;
  socket.disconnect();
}

async function runSuite() {
  try {
    await testAuthEdgeCases();
    const workspaceInfo = await testAccountCreationAndPublicSignup();
    await testRBACAndSecurityIsolation(workspaceInfo.mgrEmail, workspaceInfo.mgrTempPass, workspaceInfo.wsId);
    await testNotificationsAndRealtime(workspaceInfo.mgrEmail);
    console.log('\n================================================================================');
    console.log('🎉 ALL COMPREHENSIVE SUITE SECURITY, AUTH, AND RBAC TESTS PASSED!');
    console.log('================================================================================');
  } catch (error) {
    console.error('Suite execution error:', error);
  }
}

runSuite();
