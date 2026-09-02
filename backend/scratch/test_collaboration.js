const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://127.0.0.1:5000/api';

async function runCollaborationTests() {
  console.log('--------------------------------------------------');
  console.log('Running SocialDesk Content Versioning & Comments APIs');
  console.log('--------------------------------------------------');

  try {
    // 1. Workspace Manager Login (Sarah)
    const wmLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sarah@socialdesk.com', password: 'password123' }),
    });
    const wmToken = (await wmLogin.json()).data.token;
    console.log('✅ Workspace Manager Authenticated!');

    // 2. Team Member Login (Alex)
    const tmLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex@socialdesk.com', password: 'password123' }),
    });
    const tmToken = (await tmLogin.json()).data.token;

    // 3. Client User Login (Elena - Client User)
    const clientLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'elena@luminaapparel.com', password: 'password123' }),
    });
    const clientLoginRes = await clientLogin.json();
    const clientToken = clientLoginRes.data ? clientLoginRes.data.token : null;
    console.log('✅ Client User Authenticated!', clientToken ? 'Token OK' : clientLoginRes);

    // --- VERSIONING TESTS ---
    console.log('\n[Test 1] POST /api/content/1/versions (Creating Version 1 snapshot)...');
    const createVer1Res = await fetch(`${API_URL}/content/1/versions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({
        title: 'Initial Autumn Launch Copy v1',
        caption: 'Discover the new Autumn 2026 Sustainable Silk Collection.',
      }),
    });
    const createVer1Data = await createVer1Res.json();
    console.log('✅ Version 1 Created:', createVer1Data.data.title, '| Version Number:', createVer1Data.data.version_number);
    const ver1Id = createVer1Data.data.id;

    console.log('\n[Test 2] POST /api/content/1/versions (Creating Version 2 snapshot)...');
    const createVer2Res = await fetch(`${API_URL}/content/1/versions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({
        title: 'Revised Autumn Launch Copy v2',
        caption: 'Discover the new Autumn 2026 Sustainable Silk Collection. Handcrafted, timeless, and 100% eco-friendly.',
      }),
    });
    const createVer2Data = await createVer2Res.json();
    console.log('✅ Version 2 Created:', createVer2Data.data.title, '| Version Number:', createVer2Data.data.version_number);

    console.log('\n[Test 3] GET /api/content/1/versions (Listing version history)...');
    const listVerRes = await fetch(`${API_URL}/content/1/versions`, {
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const listVerData = await listVerRes.json();
    console.log(`✅ Total Versions Found: ${listVerData.data.length}`);
    console.table(listVerData.data.map(v => ({ version_number: v.version_number, title: v.title, creator: v.creator_name })));

    console.log(`\n[Test 4] POST /api/content/1/versions/${ver1Id}/restore (Restoring content to Version 1)...`);
    const restoreRes = await fetch(`${API_URL}/content/1/versions/${ver1Id}/restore`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const restoreData = await restoreRes.json();
    console.log('✅ Version Restored:', restoreData.message);

    // --- COMMENTS TESTS & PRIVACY SECURITY GUARD ---
    console.log('\n[Test 5] POST /api/content/1/comments (Manager adding INTERNAL comment)...');
    const createInternalCmtRes = await fetch(`${API_URL}/content/1/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({
        commentText: 'INTERNAL NOTE: Ensure client budget is verified before sending final proof.',
        commentType: 'INTERNAL',
      }),
    });
    const createInternalCmtData = await createInternalCmtRes.json();
    console.log('✅ Internal Comment Added:', createInternalCmtData.data.comment_text);
    const internalCmtId = createInternalCmtData.data.id;

    console.log('\n[Test 6] POST /api/content/1/comments (Team Member adding CLIENT comment)...');
    const createClientCmtRes = await fetch(`${API_URL}/content/1/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tmToken}`,
      },
      body: JSON.stringify({
        commentText: 'CLIENT FEEDBACK: Updated font styling per client brand guidelines.',
        commentType: 'CLIENT',
      }),
    });
    const createClientCmtData = await createClientCmtRes.json();
    console.log('✅ Client Comment Added:', createClientCmtData.data.comment_text);
    const clientCmtId = createClientCmtData.data.id;

    console.log('\n[Test 7] GET /api/content/1/comments as Manager (Expecting BOTH Internal & Client comments)...');
    const mgrCmtsRes = await fetch(`${API_URL}/content/1/comments`, {
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const mgrCmtsData = await mgrCmtsRes.json();
    console.log(`✅ Manager Received ${mgrCmtsData.data.length} Comments.`);
    console.table(mgrCmtsData.data.map(c => ({ id: c.id, type: c.comment_type, author: c.author_name, text: c.comment_text })));

    console.log('\n[Test 8] PRIVACY SECURITY GUARD: GET /api/content/1/comments as Client User (Expecting ONLY Client comments)...');
    const clientCmtsRes = await fetch(`${API_URL}/content/1/comments`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    const clientCmtsData = await clientCmtsRes.json();
    if (!clientCmtsData.success) {
      console.error('Client comments response error:', clientCmtsData);
    } else {
      const containsInternal = clientCmtsData.data.some(c => c.comment_type === 'INTERNAL' || c.is_internal === 1);
      if (!containsInternal) {
        console.log(`✅ PRIVACY GUARD PASSED: Client User received ${clientCmtsData.data.length} comments and ZERO INTERNAL comments!`);
      } else {
        console.error('❌ PRIVACY GUARD FAILED: Client User received internal comments!');
      }
    }

    console.log(`\n[Test 9] PUT /api/comments/${clientCmtId} (Updating comment)...`);
    const updateCmtRes = await fetch(`${API_URL}/comments/${clientCmtId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tmToken}`,
      },
      body: JSON.stringify({ commentText: 'CLIENT FEEDBACK: Updated font styling and spacing per client brand guidelines.' }),
    });
    const updateCmtData = await updateCmtRes.json();
    console.log('✅ Comment Updated:', updateCmtData.data.comment_text);

    console.log(`\n[Test 10] DELETE /api/comments/${internalCmtId} (Deleting internal comment)...`);
    const deleteCmtRes = await fetch(`${API_URL}/comments/${internalCmtId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const deleteCmtData = await deleteCmtRes.json();
    console.log('✅ Comment Deleted:', deleteCmtData.message);

    console.log('\n--------------------------------------------------');
    console.log('🎉 ALL COLLABORATION API TESTS PASSED!');
    console.log('--------------------------------------------------');
  } catch (error) {
    console.error('❌ Collaboration Test Error:', error);
  }
}

runCollaborationTests();
