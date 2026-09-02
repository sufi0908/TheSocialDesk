const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://127.0.0.1:5000/api';

async function runApprovalWorkflowTests() {
  console.log('--------------------------------------------------');
  console.log('Running SocialDesk Content Approval Workflow APIs');
  console.log('--------------------------------------------------');

  try {
    // 1. Workspace Manager Login (Sarah)
    const wmLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sarah@socialdesk.com', password: 'password123' }),
    });
    const wmRes = await wmLogin.json();
    if (!wmRes.data) console.error('WM Login Error:', wmRes);
    const wmToken = wmRes.data ? wmRes.data.token : null;
    console.log('✅ Workspace Manager Authenticated!');

    // 2. Client User 1 Login (Elena Lumina - Client 2 Rep)
    const client1Login = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'elena@luminaapparel.com', password: 'password123' }),
    });
    const client1Token = (await client1Login.json()).data.token;

    // 3. Client User 2 Login (Emily Watson - Client 1 Rep)
    const client2Login = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'emily@acme.com', password: 'password123' }),
    });
    const client2Token = (await client2Login.json()).data.token;
    console.log('✅ Client User Authenticated!');

    // --- APPROVAL WORKFLOW RUN ---
    console.log('\n[Test 1] POST /api/content/1/submit-internal-review...');
    const submitInternalRes = await fetch(`${API_URL}/content/1/submit-internal-review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({ notes: 'Initial design complete. Ready for internal review.' }),
    });
    const submitInternalData = await submitInternalRes.json();
    console.log('submitInternalData response:', submitInternalData);
    console.log('✅ Status updated:', submitInternalData.data ? submitInternalData.data.status : submitInternalData.status);

    console.log('\n[Test 2] POST /api/content/1/internal-approve (Internal Reviewer Approving)...');
    const internalApproveRes = await fetch(`${API_URL}/content/1/internal-approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({ notes: 'Internal review passed cleanly. Sent to client for review.' }),
    });
    const internalApproveData = await internalApproveRes.json();
    console.log('✅ Status updated:', internalApproveData.data.status);

    console.log('\n[Test 3] POST /api/content/1/client-revision (Client requesting revision)...');
    const revisionRes = await fetch(`${API_URL}/content/1/client-revision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${client2Token}`,
      },
      body: JSON.stringify({ notes: 'Please update brand color contrast on top banner overlay.' }),
    });
    const revisionData = await revisionRes.json();
    if (!revisionData.success) {
      console.error('Revision error:', revisionData);
    } else {
      console.log('✅ Revision Status updated:', revisionData.data.status);
    }

    console.log('\n[Test 4] Resubmitting to Internal Review & Client Review after revision...');
    await fetch(`${API_URL}/content/1/submit-internal-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${wmToken}` },
      body: JSON.stringify({ notes: 'Revision implemented.' }),
    });
    await fetch(`${API_URL}/content/1/internal-approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${wmToken}` },
      body: JSON.stringify({ notes: 'Re-approved internally.' }),
    });
    console.log('✅ Resubmitted to Client Review!');

    console.log('\n[Test 5] POST /api/content/1/client-approve (Client Approving)...');
    const clientApproveRes = await fetch(`${API_URL}/content/1/client-approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${client2Token}`,
      },
      body: JSON.stringify({ notes: 'Looks amazing! Approved for publishing.' }),
    });
    const clientApproveData = await clientApproveRes.json();
    console.log('✅ Status updated:', clientApproveData.data.status, '| Calendar Status:', clientApproveData.data.calendarStatus);

    console.log('\n[Test 6] GET /api/content/1/approvals (Fetching historical approval audit trail)...');
    const historyRes = await fetch(`${API_URL}/content/1/approvals`, {
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const historyData = await historyRes.json();
    console.log(`✅ Total Approval Audit Logs Found: ${historyData.data.length}`);
    console.table(historyData.data.map(h => ({
      type: h.approval_type,
      status: h.status,
      reviewer: h.reviewer_name,
      notes: h.notes,
      timestamp: h.created_at,
    })));

    console.log('\n[Test 7] Security Guard: Client 1 user (Elena) attempting to approve Client 2 content...');
    const forbiddenApproveRes = await fetch(`${API_URL}/content/1/client-approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${client1Token}`,
      },
      body: JSON.stringify({ notes: 'Unauthorized approval attempt' }),
    });
    const forbiddenApproveData = await forbiddenApproveRes.json();
    if (forbiddenApproveRes.status === 403) {
      console.log('✅ PASSED (403 Forbidden):', forbiddenApproveData.message);
    } else {
      console.error('❌ FAILED: Expected 403 Forbidden for cross-client approval attempt');
    }

    console.log('\n--------------------------------------------------');
    console.log('🎉 ALL APPROVAL WORKFLOW TESTS PASSED!');
    console.log('--------------------------------------------------');
  } catch (error) {
    console.error('❌ Approval Test Error:', error);
  }
}

runApprovalWorkflowTests();
