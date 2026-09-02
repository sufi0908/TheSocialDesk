const jwt = require('jsonwebtoken');
const { db } = require('../src/config/database');

(async () => {
  try {
    console.log('================================================================');
    console.log('STARTING COMPLETE APPROVAL WORKFLOW & CALENDAR PIPELINE TEST');
    console.log('================================================================');

    // 1. Get test users
    const [managers] = await db.query(
      'SELECT u.id, u.full_name, u.email, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = ? OR r.name = ? LIMIT 1',
      ['workspace_manager', 'superadmin']
    );
    const [creators] = await db.query(
      'SELECT u.id, u.full_name, u.email, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = ? OR r.name = ? LIMIT 1',
      ['graphic_designer', 'social_media_manager']
    );
    const [clients] = await db.query('SELECT id, name, company_name, workspace_id FROM clients WHERE deleted_at IS NULL LIMIT 1');
    const client = clients[0];
    const workspaceId = client.workspace_id || 1;

    const manager = managers[0];
    const creator = creators[0] || manager;

    // Fetch or create client team link for client user
    const [clientUsers] = await db.query(
      'SELECT u.id, u.full_name, u.email, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = ? OR r.name = ? LIMIT 1',
      ['client', 'client_user']
    );
    let clientUser = clientUsers[0];
    if (clientUser) {
      await db.query(
        'INSERT IGNORE INTO client_team (client_id, user_id, role, created_at) VALUES (?, ?, ?, NOW())',
        [client.id, clientUser.id, 'client_lead']
      );
    }

    const managerToken = jwt.sign({ id: manager.id, email: manager.email, role: manager.role, workspaceId }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const creatorToken = jwt.sign({ id: creator.id, email: creator.email, role: creator.role, workspaceId }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const clientToken = clientUser ? jwt.sign({ id: clientUser.id, email: clientUser.email, role: 'client', workspaceId }, process.env.JWT_SECRET, { expiresIn: '1h' }) : managerToken;

    console.log('Actors:', {
      manager: manager.full_name,
      creator: creator.full_name,
      clientUser: clientUser ? clientUser.full_name : 'Simulated Client',
      client: client.company_name || client.name,
      workspaceId
    });

    // -------------------------------------------------------------
    // TEST 1: Team member creates content in DRAFT and submits for INTERNAL_REVIEW
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Create Content & Submit for Internal Review ---');
    const createRes = await fetch('http://localhost:5000/api/content', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + creatorToken, 'X-Workspace-Id': String(workspaceId), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Workflow Test Post #' + Date.now(),
        caption: 'Workflow test copy for end-to-end validation.',
        contentType: 'Single Post',
        clientId: client.id,
        platforms: ['instagram', 'linkedin'],
        status: 'DRAFT'
      })
    });
    const createJson = await createRes.json();
    const postId = createJson.data.id;
    console.log('1a. Created Post in DRAFT:', { id: postId, status: createJson.data.status });

    const submitIntRes = await fetch('http://localhost:5000/api/content/' + postId + '/submit-internal-review', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + creatorToken, 'X-Workspace-Id': String(workspaceId), 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'Please review visual alignment and caption tags.' })
    });
    const submitIntJson = await submitIntRes.json();
    console.log('1b. Submitted for Internal Review:', submitIntJson.data);
    if (submitIntJson.data.status !== 'INTERNAL_REVIEW') throw new Error('Test 1 failed: Status is not INTERNAL_REVIEW');

    // -------------------------------------------------------------
    // TEST 2: Workspace Manager Approves Internally -> CLIENT_REVIEW
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Internal Approval -> Moves to CLIENT_REVIEW ---');
    const approveIntRes = await fetch('http://localhost:5000/api/content/' + postId + '/internal-approve', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + managerToken, 'X-Workspace-Id': String(workspaceId), 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'Internal review passed. Sent to client.' })
    });
    const approveIntJson = await approveIntRes.json();
    console.log('2. Internally Approved:', approveIntJson.data);
    if (approveIntJson.data.status !== 'CLIENT_REVIEW') throw new Error('Test 2 failed: Status is not CLIENT_REVIEW');

    // -------------------------------------------------------------
    // TEST 3: Workspace Manager / Head Requests Revision -> REVISION_REQUIRED
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Manager requests internal revision on post ---');
    // Put post into INTERNAL_REVIEW first for revision testing
    await db.query('UPDATE content SET status = "INTERNAL_REVIEW" WHERE id = ?', [postId]);
    const intRevRes = await fetch('http://localhost:5000/api/content/' + postId + '/internal-revision', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + managerToken, 'X-Workspace-Id': String(workspaceId), 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'Please change the background and update the caption.' })
    });
    const intRevJson = await intRevRes.json();
    console.log('3. Internal Revision Requested:', intRevJson.data);
    if (intRevJson.data.status !== 'REVISION_REQUIRED') throw new Error('Test 3 failed: Status is not REVISION_REQUIRED');

    // -------------------------------------------------------------
    // TEST 4: Team Member Resubmits -> Moves to INTERNAL_REVIEW
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Team member resubmits after internal revision ---');
    const resubmitRes = await fetch('http://localhost:5000/api/content/' + postId + '/resubmit', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + creatorToken, 'X-Workspace-Id': String(workspaceId), 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'Updated background color and caption as requested.' })
    });
    const resubmitJson = await resubmitRes.json();
    console.log('4. Content Resubmitted:', resubmitJson.data);
    if (resubmitJson.data.status !== 'INTERNAL_REVIEW') throw new Error('Test 4 failed: Status is not INTERNAL_REVIEW');

    // -------------------------------------------------------------
    // TEST 5: Manager approves internally -> CLIENT_REVIEW
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Manager approves internally -> CLIENT_REVIEW ---');
    const approveIntRes2 = await fetch('http://localhost:5000/api/content/' + postId + '/internal-approve', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + managerToken, 'X-Workspace-Id': String(workspaceId), 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'Revisions verified and approved.' })
    });
    const approveIntJson2 = await approveIntRes2.json();
    console.log('5. Internally Approved:', approveIntJson2.data);
    if (approveIntJson2.data.status !== 'CLIENT_REVIEW') throw new Error('Test 5 failed: Status is not CLIENT_REVIEW');

    // -------------------------------------------------------------
    // TEST 6: Client requests revision during CLIENT_REVIEW
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Client requests revision -> REVISION_REQUIRED ---');
    const clientRevRes = await fetch('http://localhost:5000/api/content/' + postId + '/client-revision', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + clientToken, 'X-Workspace-Id': String(workspaceId), 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'Please make the logo smaller and adjust button contrast.' })
    });
    const clientRevJson = await clientRevRes.json();
    console.log('6. Client Revision Requested:', clientRevJson.data);
    if (clientRevJson.data.status !== 'REVISION_REQUIRED') throw new Error('Test 6 failed: Status is not REVISION_REQUIRED');

    // -------------------------------------------------------------
    // TEST 7: Team member resubmits & manager approves to CLIENT_REVIEW
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Resubmission & Manager Approval to CLIENT_REVIEW ---');
    await fetch('http://localhost:5000/api/content/' + postId + '/resubmit', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + creatorToken, 'X-Workspace-Id': String(workspaceId), 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'Logo size adjusted to 24px and button contrast fixed.' })
    });
    await fetch('http://localhost:5000/api/content/' + postId + '/internal-approve', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + managerToken, 'X-Workspace-Id': String(workspaceId), 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'Approved for client review.' })
    });
    const [p7] = await db.query('SELECT status FROM content WHERE id = ?', [postId]);
    console.log('7. Content in CLIENT_REVIEW:', p7[0]);
    if (p7[0].status !== 'CLIENT_REVIEW') throw new Error('Test 7 failed');

    // -------------------------------------------------------------
    // TEST 8: Client approves directly inside SocialDesk -> APPROVED & Calendar ready
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Client approves directly inside SocialDesk -> APPROVED ---');
    const clientApproveRes = await fetch('http://localhost:5000/api/content/' + postId + '/client-approve', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + clientToken, 'X-Workspace-Id': String(workspaceId), 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'Looks amazing, approved for publishing!' })
    });
    const clientApproveJson = await clientApproveRes.json();
    console.log('8. Client Approved:', clientApproveJson.data);
    if (clientApproveJson.data.status !== 'APPROVED') throw new Error('Test 8 failed: Status is not APPROVED');

    // Verify presence in Calendar Unscheduled list
    const uncalRes = await fetch('http://localhost:5000/api/calendar/unscheduled', {
      headers: { 'Authorization': 'Bearer ' + managerToken, 'X-Workspace-Id': String(workspaceId) }
    });
    const uncalJson = await uncalRes.json();
    const foundInUnscheduled = uncalJson.data.find(c => c.content_id === postId);
    console.log('8b. Found in Calendar Unscheduled Queue:', foundInUnscheduled ? { id: foundInUnscheduled.content_id, title: foundInUnscheduled.title } : null);
    if (!foundInUnscheduled) throw new Error('Test 8 failed: Approved content not found in Calendar Unscheduled queue!');

    // -------------------------------------------------------------
    // TEST 9: External / WhatsApp Client Approval Recording
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Workspace Manager records external WhatsApp approval ---');
    // Create a new post for WhatsApp approval test
    const createWaRes = await fetch('http://localhost:5000/api/content', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + creatorToken, 'X-Workspace-Id': String(workspaceId), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'WhatsApp Approval Test Post #' + Date.now(),
        caption: 'Post for external WhatsApp approval testing.',
        contentType: 'Carousel Post',
        clientId: client.id,
        platforms: ['facebook', 'instagram'],
        status: 'CLIENT_REVIEW'
      })
    });
    const createWaJson = await createWaRes.json();
    const waPostId = createWaJson.data.id;

    const externalApproveRes = await fetch('http://localhost:5000/api/content/' + waPostId + '/external-client-approve', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + managerToken, 'X-Workspace-Id': String(workspaceId), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approvalSource: 'WhatsApp',
        notes: 'Client approved via WhatsApp on Aug 31.',
        approvedBy: 'John Doe (Brand Manager)'
      })
    });
    const externalApproveJson = await externalApproveRes.json();
    console.log('9. External WhatsApp Approval Recorded:', externalApproveJson.data);
    if (externalApproveJson.data.status !== 'APPROVED' || externalApproveJson.data.approvalSource !== 'WhatsApp') {
      throw new Error('Test 9 failed: WhatsApp approval not recorded correctly');
    }

    // -------------------------------------------------------------
    // TEST 10: Calendar Scheduling & Drag/Drop Persistence
    // -------------------------------------------------------------
    console.log('\n--- TEST 10: Calendar Scheduling & Drag/Drop Persistence ---');
    const scheduleDate = '2026-08-31';
    const scheduleTime = '19:00:00';
    const scheduledDateTime = `${scheduleDate} ${scheduleTime}`;

    const scheduleRes = await fetch('http://localhost:5000/api/calendar/schedule', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + managerToken, 'X-Workspace-Id': String(workspaceId), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentId: postId,
        scheduledAt: scheduledDateTime,
        date: scheduleDate,
        time: scheduleTime,
        timezone: 'UTC'
      })
    });
    const scheduleJson = await scheduleRes.json();
    console.log('10a. Schedule API Response:', scheduleJson.data);

    // Verify in MySQL
    const [schedContentRows] = await db.query('SELECT id, title, status, scheduled_at FROM content WHERE id = ?', [postId]);
    console.log('10b. MySQL Content row after scheduling:', schedContentRows[0]);
    if (schedContentRows[0].status !== 'SCHEDULED' || !schedContentRows[0].scheduled_at) {
      throw new Error('Test 10 failed: Content status is not SCHEDULED or scheduled_at is null');
    }

    // Verify in GET /api/calendar (Calendar list)
    const calListRes = await fetch('http://localhost:5000/api/calendar?startDate=2026-08-01&endDate=2026-09-30', {
      headers: { 'Authorization': 'Bearer ' + managerToken, 'X-Workspace-Id': String(workspaceId) }
    });
    const calListJson = await calListRes.json();
    const calItem = calListJson.data.find(c => c.content_id === postId);
    console.log('10c. Found in Calendar List API:', { content_id: calItem?.content_id, title: calItem?.title, scheduled_at: calItem?.scheduled_at, status: calItem?.content_status });

    // Test Reschedule (Drag to another date/time: 2026-09-02 15:30:00)
    const rescheduleRes = await fetch('http://localhost:5000/api/calendar/' + postId, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + managerToken, 'X-Workspace-Id': String(workspaceId), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: '2026-09-02',
        time: '15:30:00',
        scheduledAt: '2026-09-02 15:30:00'
      })
    });
    const rescheduleJson = await rescheduleRes.json();
    console.log('10d. Reschedule (Drag & Drop) Response:', rescheduleJson.data);

    const [reschedRows] = await db.query('SELECT id, status, scheduled_at FROM content WHERE id = ?', [postId]);
    console.log('10e. MySQL Content after Reschedule (Refresh Simulation):', reschedRows[0]);
    const reschedIso = new Date(reschedRows[0].scheduled_at).toISOString();
    if (!reschedIso.includes('2026-09-02')) {
      throw new Error('Test 10 failed: Rescheduled date did not persist in MySQL: ' + reschedIso);
    }

    console.log('\n================================================================');
    console.log('ALL 10 WORKFLOW & CALENDAR TESTS PASSED WITH 100% SUCCESS');
    console.log('================================================================');
    process.exit(0);
  } catch (err) {
    console.error('INTEGRATION TEST FAILED:', err);
    process.exit(1);
  }
})();
