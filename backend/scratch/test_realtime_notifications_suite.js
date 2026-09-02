const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');
const { db } = require('../src/config/database');

const API_URL = 'http://127.0.0.1:5000/api';
const WS_URL = 'http://127.0.0.1:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'development-only-socialdesk-jwt-secret';

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      userId: user.id,
      email: user.email,
      name: user.full_name,
      role: user.role,
      workspaceId: 1,
      workspace_id: 1,
    },
    JWT_SECRET,
    { expiresIn: '2h', algorithm: 'HS256' }
  );
}

async function runSuite() {
  console.log('============================================================');
  console.log('STARTING SOCIALDESK REAL-TIME NOTIFICATIONS HTTP & WS SUITE');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  let managerSocket = null;
  let designerSocket = null;
  let createdTaskId = null;
  let createdNotifId = null;

  try {
    const workspaceId = 1;
    const [users] = await db.query('SELECT id, full_name, email FROM users WHERE id IN (2, 6)');
    const manager = { ...users.find((u) => u.id === 2), role: 'workspace_manager' };
    const designer = { ...users.find((u) => u.id === 6), role: 'graphic_designer' };

    console.log(`Actors:`);
    console.log(`  Manager (User A): ${manager.full_name} (ID: ${manager.id})`);
    console.log(`  Designer (User B): ${designer.full_name} (ID: ${designer.id})\n`);

    const managerToken = createToken(manager);
    const designerToken = createToken(designer);

    // ============================================================
    // STEP 1: CONNECT AUTHENTICATED SOCKETS
    // ============================================================
    console.log('--- STEP 1: Connect Authenticated Sockets ---');

    const designerEvents = [];
    const managerEvents = [];

    designerSocket = io(WS_URL, {
      auth: { token: designerToken },
      transports: ['websocket'],
    });

    managerSocket = io(WS_URL, {
      auth: { token: managerToken },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise((resolve) => designerSocket.on('connect', resolve)),
      new Promise((resolve) => managerSocket.on('connect', resolve)),
    ]);

    assert(designerSocket.connected, `Designer Socket connected (ID: ${designerSocket.id})`);
    assert(managerSocket.connected, `Manager Socket connected (ID: ${managerSocket.id})`);

    designerSocket.on('notification', (notif) => {
      designerEvents.push(notif);
    });

    managerSocket.on('notification', (notif) => {
      managerEvents.push(notif);
    });

    // Stabilization delay
    await new Promise((r) => setTimeout(r, 600));

    // ============================================================
    // STEP 2: MANAGER CREATES & ASSIGNS TASK VIA HTTP API
    // ============================================================
    console.log('\n--- STEP 2: Manager Assigns Task via HTTP API ---');
    const taskRes = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        title: `Realtime FB Posting ${Date.now()}`,
        description: 'Create FB creative.',
        clientId: 1,
        assignedTo: designer.id,
        priority: 'HIGH',
      }),
    });

    const taskJson = await taskRes.json();
    assert(taskJson.success && taskJson.data?.id > 0, `Task created via API (ID: ${taskJson.data?.id})`);
    createdTaskId = taskJson.data?.id;

    // Await Socket propagation
    await new Promise((r) => setTimeout(r, 800));

    assert(designerEvents.length >= 1, `Designer received real-time Socket.IO notification event!`);
    const assignEvt = designerEvents.find((e) => e.type === 'TASK_ASSIGNED');
    assert(assignEvt !== undefined, `Notification type is TASK_ASSIGNED: "${assignEvt?.title}"`);
    assert(assignEvt?.link === `/workspace/tasks/${createdTaskId}`, `Target link is /workspace/tasks/${createdTaskId}`);
    createdNotifId = assignEvt?.id;

    // Verify Manager did NOT receive Designer's assignment notification
    const managerGotAssign = managerEvents.find((e) => e.relatedTaskId === createdTaskId && e.type === 'TASK_ASSIGNED');
    assert(managerGotAssign === undefined, `Manager was correctly NOT sent Designer's assignment notification`);

    // ============================================================
    // STEP 3: DESIGNER COMMENTS VIA HTTP API
    // ============================================================
    console.log('\n--- STEP 3: Designer Comments via HTTP API ---');
    const commentRes = await fetch(`${API_URL}/tasks/${createdTaskId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${designerToken}`,
      },
      body: JSON.stringify({ message: 'Here is the first draft.' }),
    });

    const commentJson = await commentRes.json();
    assert(commentJson.success, `Comment posted via API`);

    await new Promise((r) => setTimeout(r, 800));

    const managerCommentEvt = managerEvents.find((e) => e.type === 'TASK_COMMENT');
    assert(managerCommentEvt !== undefined, `Manager received real-time TASK_COMMENT notification: "${managerCommentEvt?.title}"`);

    // Verify Designer did NOT receive notification for their own comment
    const designerSelfComment = designerEvents.find((e) => e.type === 'TASK_COMMENT' && e.message.includes('Here is the first draft.'));
    assert(designerSelfComment === undefined, `Designer was correctly NOT notified of their own comment`);

    // ============================================================
    // STEP 4: UNREAD COUNT & MARK AS READ VIA API
    // ============================================================
    console.log('\n--- STEP 4: Live Unread Count & Mark as Read API ---');
    const unreadRes = await fetch(`${API_URL}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${designerToken}` },
    });
    const unreadJson = await unreadRes.json();
    assert(unreadJson.success && unreadJson.unreadCount >= 1, `Live unread count returned from API: ${unreadJson.unreadCount}`);

    if (createdNotifId) {
      const readRes = await fetch(`${API_URL}/notifications/${createdNotifId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${designerToken}` },
      });
      const readJson = await readRes.json();
      assert(readJson.success, `Notification #${createdNotifId} marked as read via API`);

      const unreadAfterRes = await fetch(`${API_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${designerToken}` },
      });
      const unreadAfterJson = await unreadAfterRes.json();
      assert(unreadAfterJson.unreadCount === unreadJson.unreadCount - 1, `Unread count decremented in MySQL`);
    }

    // ============================================================
    // STEP 5: SECURITY & WORKSPACE ISOLATION
    // ============================================================
    console.log('\n--- STEP 5: Security Verification ---');
    if (createdNotifId) {
      const wrongUserRes = await fetch(`${API_URL}/notifications/${createdNotifId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${managerToken}` },
      });
      assert(wrongUserRes.status === 404 || wrongUserRes.status === 403, `Manager BLOCKED from marking Designer's notification as read (HTTP ${wrongUserRes.status})`);
    }

    // Cleanup
    await db.query('DELETE FROM task_comments WHERE task_id = ?', [createdTaskId]);
    await db.query('DELETE FROM task_activity WHERE task_id = ?', [createdTaskId]);
    await db.query('DELETE FROM notifications WHERE related_task_id = ?', [createdTaskId]);
    await db.query('DELETE FROM tasks WHERE id = ?', [createdTaskId]);

  } catch (err) {
    console.error('CRITICAL UNEXPECTED ERROR IN TEST SUITE:', err);
    failed++;
  } finally {
    if (designerSocket) designerSocket.disconnect();
    if (managerSocket) managerSocket.disconnect();

    console.log('\n============================================================');
    console.log(`REAL-TIME SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log('============================================================');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runSuite();
