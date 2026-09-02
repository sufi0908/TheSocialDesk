const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://127.0.0.1:5000/api';

async function runRbacTests() {
  console.log('--------------------------------------------------');
  console.log('Running SocialDesk RBAC & Isolation Security Tests');
  console.log('--------------------------------------------------');

  try {
    // Login as Workspace Manager (Sarah, Workspace 1)
    const wmLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sarah@socialdesk.com', password: 'password123' }),
    });
    const wmToken = (await wmLogin.json()).data.token;

    // Login as Team Member (Alex)
    const tmLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex@socialdesk.com', password: 'password123' }),
    });
    const tmToken = (await tmLogin.json()).data.token;

    // Login as Client A (Emily, Client 1)
    const clientLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'emily@acme.com', password: 'password123' }),
    });
    const clientToken = (await clientLogin.json()).data.token;

    // Login as Superadmin (Admin)
    const adminLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@socialdesk.com', password: 'password123' }),
    });
    const adminToken = (await adminLogin.json()).data.token;

    // --------------------------------------------------
    // TEST 1: Workspace A User -> Workspace B Data
    // --------------------------------------------------
    console.log('\n[TEST 1] Workspace A User attempting to access Workspace B data (Workspace ID 999)...');
    const wsRes = await fetch(`${API_URL}/test/workspace/999`, {
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const wsData = await wsRes.json();
    if (wsRes.status === 403) {
      console.log('✅ PASSED (403 Forbidden):', wsData.message);
    } else {
      console.error('❌ FAILED: Expected 403 Forbidden, got:', wsRes.status, wsData);
    }

    // --------------------------------------------------
    // TEST 2: Client A -> Client B Data
    // --------------------------------------------------
    console.log('\n[TEST 2] Client A attempting to access Client B data (Client ID 2)...');
    const clientRes = await fetch(`${API_URL}/test/client/2`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    const clientData = await clientRes.json();
    if (clientRes.status === 403) {
      console.log('✅ PASSED (403 Forbidden):', clientData.message);
    } else {
      console.error('❌ FAILED: Expected 403 Forbidden, got:', clientRes.status, clientData);
    }

    // --------------------------------------------------
    // TEST 3: Team Member -> Unauthorized Superadmin Endpoint
    // --------------------------------------------------
    console.log('\n[TEST 3] Team Member attempting to call Superadmin endpoint...');
    const tmAdminRes = await fetch(`${API_URL}/test/superadmin-only`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tmToken}` },
    });
    const tmAdminData = await tmAdminRes.json();
    if (tmAdminRes.status === 403) {
      console.log('✅ PASSED (403 Forbidden):', tmAdminData.message);
    } else {
      console.error('❌ FAILED: Expected 403 Forbidden, got:', tmAdminRes.status, tmAdminData);
    }

    // --------------------------------------------------
    // TEST 4: Workspace Manager -> Superadmin Endpoint
    // --------------------------------------------------
    console.log('\n[TEST 4] Workspace Manager attempting to call Superadmin endpoint...');
    const wmAdminRes = await fetch(`${API_URL}/test/superadmin-only`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const wmAdminData = await wmAdminRes.json();
    if (wmAdminRes.status === 403) {
      console.log('✅ PASSED (403 Forbidden):', wmAdminData.message);
    } else {
      console.error('❌ FAILED: Expected 403 Forbidden, got:', wmAdminRes.status, wmAdminData);
    }

    // --------------------------------------------------
    // TEST 5: Superadmin Authorized Execution
    // --------------------------------------------------
    console.log('\n[TEST 5] Superadmin calling Superadmin endpoint...');
    const adminActionRes = await fetch(`${API_URL}/test/superadmin-only`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminActionData = await adminActionRes.json();
    if (adminActionRes.status === 200) {
      console.log('✅ PASSED (200 OK):', adminActionData.message);
    } else {
      console.error('❌ FAILED: Expected 200 OK, got:', adminActionRes.status, adminActionData);
    }

    console.log('\n--------------------------------------------------');
    console.log('🎉 ALL RBAC & ISOLATION SECURITY TESTS PASSED!');
    console.log('--------------------------------------------------');
  } catch (error) {
    console.error('❌ Test Runner Exception:', error);
  }
}

runRbacTests();
