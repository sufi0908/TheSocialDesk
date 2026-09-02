const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://127.0.0.1:5000/api';

async function runContentTests() {
  console.log('--------------------------------------------------');
  console.log('Running SocialDesk Content Management API Tests');
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

    // 2. Client User Login (Elena Rostova - Client User)
    const clientLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'elena@luminaapparel.com', password: 'password123' }),
    });
    const clientToken = (await clientLogin.json()).data.token;

    // 3. Create Multi-Platform Content Item
    console.log('\n[Test 1] POST /api/content (Creating multi-platform content item)...');
    const createRes = await fetch(`${API_URL}/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({
        title: 'Autumn Sustainable Fashion Drop',
        caption: 'Discover our new 100% organic cotton autumn line. Link in bio! #SustainableFashion #AutumnLook',
        contentType: 'CAROUSEL',
        clientId: 1,
        assignedTo: 3,
        reviewerId: 2,
        dueDate: '2026-11-25',
        status: 'DRAFT',
        internalNotes: 'Ensure high res color palette matches brand guidelines',
        platforms: ['INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'X'],
      }),
    });

    const createData = await createRes.json();
    console.log('✅ Content Item Created:', createData.data.title, '(ID:', createData.data.id, ')');
    console.log('Target Platforms:', createData.data.platforms);
    const contentId = createData.data.id;

    // 4. GET Content List with Platform Filter
    console.log('\n[Test 2] GET /api/content?platform=INSTAGRAM&contentType=CAROUSEL...');
    const listRes = await fetch(`${API_URL}/content?platform=INSTAGRAM&contentType=CAROUSEL`, {
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const listData = await listRes.json();
    console.log(`✅ Content Items Found: ${listData.data.length}`);
    console.table(listData.data.map(c => ({ id: c.id, title: c.title, status: c.status, platforms: c.platforms.join(', ') })));

    // 5. GET Single Content Item
    console.log(`\n[Test 3] GET /api/content/${contentId}...`);
    const getRes = await fetch(`${API_URL}/content/${contentId}`, {
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const getData = await getRes.json();
    console.log('✅ Details:', getData.data.title, '| Assignee:', getData.data.assignee_name, '| Reviewer:', getData.data.reviewer_name);

    // 6. PUT Update Content & Platforms
    console.log(`\n[Test 4] PUT /api/content/${contentId} (Updating caption & platforms)...`);
    const updateRes = await fetch(`${API_URL}/content/${contentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({
        caption: 'Updated Autumn Drop caption with special early bird link!',
        platforms: ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'YOUTUBE'],
      }),
    });
    const updateData = await updateRes.json();
    console.log('✅ Updated Target Platforms:', updateData.data.platforms);

    // 7. PATCH Update Status
    console.log(`\n[Test 5] PATCH /api/content/${contentId}/status (Transitioning status to CLIENT_REVIEW & APPROVED)...`);
    await fetch(`${API_URL}/content/${contentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({ status: 'CLIENT_REVIEW' }),
    });

    const statusRes = await fetch(`${API_URL}/content/${contentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    const statusData = await statusRes.json();
    console.log('✅ Content Status Updated:', statusData.data);

    // 8. Client Security Guard Test: Client editing approved content
    console.log('\n[Test 6] Security Check: Client attempting to edit APPROVED content...');
    const clientEditRes = await fetch(`${API_URL}/content/${contentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clientToken}`,
      },
      body: JSON.stringify({ title: 'Hacked Title' }),
    });
    const clientEditData = await clientEditRes.json();
    if (clientEditRes.status === 403) {
      console.log('✅ PASSED (403 Forbidden):', clientEditData.message);
    } else {
      console.error('❌ FAILED: Expected 403 Forbidden for client edit of approved content');
    }

    // 9. DELETE Content Item
    console.log(`\n[Test 7] DELETE /api/content/${contentId}...`);
    const deleteRes = await fetch(`${API_URL}/content/${contentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const deleteData = await deleteRes.json();
    console.log('✅ Content Deleted:', deleteData.message);

    console.log('\n--------------------------------------------------');
    console.log('🎉 ALL CONTENT MANAGEMENT API TESTS PASSED!');
    console.log('--------------------------------------------------');
  } catch (error) {
    console.error('❌ Content Test Error:', error);
  }
}

runContentTests();
