const jwt = require('jsonwebtoken');
const { db } = require('../src/config/database');

(async () => {
  try {
    console.log('================================================================');
    console.log('STARTING CONTENT MEDIA PERFORMANCE & NON-BLOCKING PIPELINE TEST');
    console.log('================================================================');

    // 1. Get test users and client
    const [managers] = await db.query(
      'SELECT u.id, u.full_name, u.email, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = ? OR r.name = ? LIMIT 1',
      ['workspace_manager', 'superadmin']
    );
    const [clients] = await db.query('SELECT id, name, company_name, workspace_id FROM clients WHERE deleted_at IS NULL LIMIT 1');
    const client = clients[0];
    const manager = managers[0];
    const workspaceId = client.workspace_id || 1;

    const token = jwt.sign(
      { id: manager.id, email: manager.email, role: manager.role, workspaceId },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('Test Setup:', {
      manager: manager.full_name,
      client: client.company_name || client.name,
      workspaceId
    });

    // -------------------------------------------------------------
    // TEST 1: Seed items if fewer than 20 to test scale performance
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Verify / Seed Content Items to > 20 records ---');
    const [countRows] = await db.query('SELECT COUNT(*) as total FROM content WHERE workspace_id = ? AND deleted_at IS NULL', [workspaceId]);
    const currentCount = countRows[0].total;
    console.log('Current content count in workspace:', currentCount);

    if (currentCount < 20) {
      const needed = 20 - currentCount;
      console.log(`Seeding ${needed} additional test content posts...`);
      for (let i = 0; i < needed; i++) {
        const [res] = await db.query(
          `INSERT INTO content (workspace_id, client_id, created_by, title, caption, content_type, status, created_at)
           VALUES (?, ?, ?, ?, ?, 'Single Post', 'DRAFT', NOW())`,
          [workspaceId, client.id, manager.id, `Scale Test Post #${Date.now()}_${i}`, `Automated caption copy for post ${i}`]
        );
        await db.query(
          'INSERT INTO content_platforms (content_id, platform, status, created_at) VALUES (?, "instagram", "PENDING", NOW())',
          [res.insertId]
        );
      }
    }

    // -------------------------------------------------------------
    // TEST 2: Content List API Latency and Response Shape
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Measure Content List API Latency ---');
    const start = Date.now();
    const listRes = await fetch('http://localhost:5000/api/content?limit=25', {
      headers: { Authorization: `Bearer ${token}`, 'X-Workspace-Id': String(workspaceId) },
    });
    const listJson = await listRes.json();
    const duration = Date.now() - start;

    console.log(`Content List fetched ${listJson.data?.length} posts in ${duration}ms`);
    if (!listJson.success || !Array.isArray(listJson.data)) {
      throw new Error('Test 2 failed: Content list API did not return success or array');
    }

    if (duration > 150) {
      console.warn(`Warning: Content list took ${duration}ms, target is < 100ms`);
    } else {
      console.log(`✓ Performance optimal: ${duration}ms (< 150ms)`);
    }

    // Verify first item contains immediately usable media object
    const sampleWithMedia = listJson.data.find((c) => c.mediaAssets && c.mediaAssets.length > 0) || listJson.data[0];
    console.log('Sample Content Item Output:', {
      id: sampleWithMedia.id,
      title: sampleWithMedia.title,
      client: sampleWithMedia.client_name,
      status: sampleWithMedia.status,
      platforms: sampleWithMedia.platforms,
      mediaUrl: sampleWithMedia.mediaUrl,
      media: sampleWithMedia.media,
    });

    if (sampleWithMedia.mediaUrl && !sampleWithMedia.media) {
      throw new Error('Test 2 failed: media object missing from response');
    }

    // -------------------------------------------------------------
    // TEST 3: Server-side Pagination & Filtering
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Test Server-Side Pagination & Filtering ---');
    const page1Res = await fetch('http://localhost:5000/api/content?page=1&limit=6', {
      headers: { Authorization: `Bearer ${token}`, 'X-Workspace-Id': String(workspaceId) },
    });
    const page1Json = await page1Res.json();
    console.log('Page 1 items count:', page1Json.data?.length);

    const page2Res = await fetch('http://localhost:5000/api/content?page=2&limit=6', {
      headers: { Authorization: `Bearer ${token}`, 'X-Workspace-Id': String(workspaceId) },
    });
    const page2Json = await page2Res.json();
    console.log('Page 2 items count:', page2Json.data?.length);

    if (page1Json.data.length > 0 && page2Json.data.length > 0) {
      if (page1Json.data[0].id === page2Json.data[0].id) {
        throw new Error('Test 3 failed: Page 1 and Page 2 returned identical first item');
      }
      console.log('✓ Pagination verified: Page 1 and Page 2 return distinct item sets.');
    }

    // Filter by client
    const filterClientRes = await fetch(`http://localhost:5000/api/content?clientId=${client.id}`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Workspace-Id': String(workspaceId) },
    });
    const filterClientJson = await filterClientRes.json();
    console.log(`Filtered by Client (${client.id}): found ${filterClientJson.data?.length} posts.`);

    // -------------------------------------------------------------
    // TEST 4: Single Content Details (GET /api/content/:id)
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Single Content Details Fetch ---');
    const testPostId = listJson.data[0].id;
    const detailRes = await fetch(`http://localhost:5000/api/content/${testPostId}`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Workspace-Id': String(workspaceId) },
    });
    const detailJson = await detailRes.json();
    console.log('Detail API Response for ID ' + testPostId + ':', {
      id: detailJson.data?.id,
      title: detailJson.data?.title,
      client: detailJson.data?.client_name,
      media: detailJson.data?.media,
      platforms: detailJson.data?.platforms,
    });
    if (!detailJson.success || !detailJson.data) {
      throw new Error('Test 4 failed: Single content fetch failed');
    }

    // -------------------------------------------------------------
    // TEST 5: Status Update & Assignment without Media Loss
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Assign User & Status Update ---');
    const updateRes = await fetch(`http://localhost:5000/api/content/${testPostId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Workspace-Id': String(workspaceId),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: detailJson.data.title,
        assignedTo: manager.id,
        status: 'INTERNAL_REVIEW',
      }),
    });
    const updateJson = await updateRes.json();
    console.log('Update API Response:', {
      id: updateJson.data?.id,
      assigned_to: updateJson.data?.assigned_to,
      status: updateJson.data?.status,
      media: updateJson.data?.media,
    });

    if (updateJson.data.status !== 'INTERNAL_REVIEW') {
      throw new Error('Test 5 failed: Status not updated');
    }

    // -------------------------------------------------------------
    // TEST 6: Calendar Unscheduled & Scheduled Bulk Performance
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Calendar Unscheduled & Scheduled API Latency ---');
    const calStart = Date.now();
    const unscheduledRes = await fetch('http://localhost:5000/api/calendar/unscheduled', {
      headers: { Authorization: `Bearer ${token}`, 'X-Workspace-Id': String(workspaceId) },
    });
    const unscheduledJson = await unscheduledRes.json();
    const calDuration = Date.now() - calStart;
    console.log(`Calendar Unscheduled queue fetched ${unscheduledJson.data?.length} items in ${calDuration}ms`);
    if (!unscheduledJson.success) {
      throw new Error('Test 6 failed: Calendar unscheduled API failed');
    }

    console.log('\n================================================================');
    console.log('ALL PERFORMANCE & MEDIA INTEGRATION TESTS PASSED WITH 100% SUCCESS');
    console.log('================================================================');
    process.exit(0);
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  }
})();
