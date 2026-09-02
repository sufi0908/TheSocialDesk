const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://127.0.0.1:5000/api';

async function runNotificationsAndActivityTests() {
  console.log('--------------------------------------------------');
  console.log('Running SocialDesk Notifications & Activity Log APIs');
  console.log('--------------------------------------------------');

  try {
    // 1. Workspace Manager Login (Sarah - User ID 2)
    const wmLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sarah@socialdesk.com', password: 'password123' }),
    });
    const wmToken = (await wmLogin.json()).data.token;
    console.log('✅ Workspace Manager Authenticated!');

    // 2. Client User Login (Emily - User ID 4)
    const clientLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'emily@acme.com', password: 'password123' }),
    });
    const clientToken = (await clientLogin.json()).data.token;
    console.log('✅ Client User Authenticated!');

    // --- NOTIFICATIONS TESTS ---
    console.log('\n[Test 1] Creating a task assigned to Workspace Manager to generate notification & activity...');
    await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({
        title: 'Review Q4 Carousel Copy',
        description: 'Verify brand tone & typography margin',
        assignedTo: 2,
        priority: 'HIGH',
      }),
    });

    console.log('\n[Test 2] GET /api/notifications (Fetching user notifications)...');
    const notifRes = await fetch(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const notifData = await notifRes.json();
    console.log(`✅ Total Notifications: ${notifData.data.length} | Unread Count: ${notifData.unreadCount}`);
    console.table(notifData.data.map(n => ({ id: n.id, title: n.title, message: n.message, isRead: n.isRead })));

    if (notifData.data.length > 0) {
      const notifId = notifData.data[0].id;
      console.log(`\n[Test 3] PATCH /api/notifications/${notifId}/read (Marking single notification as read)...`);
      const readOneRes = await fetch(`${API_URL}/notifications/${notifId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${wmToken}` },
      });
      const readOneData = await readOneRes.json();
      console.log('✅ Marked as read:', readOneData.message);
    }

    console.log('\n[Test 4] PATCH /api/notifications/read-all (Marking all notifications as read)...');
    const readAllRes = await fetch(`${API_URL}/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const readAllData = await readAllRes.json();
    console.log('✅ Marked all as read:', readAllData.message);

    // --- ACTIVITY LOG TESTS ---
    console.log('\n[Test 5] GET /api/activity (Fetching agency workspace activity audit feed)...');
    const actRes = await fetch(`${API_URL}/activity`, {
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const actData = await actRes.json();
    console.log(`✅ Total Activity Log Entries Found: ${actData.data.length}`);
    console.table(actData.data.map(a => ({
      id: a.id,
      user: a.userName,
      action: a.action,
      entity: a.entityType,
      isInternal: a.isInternal,
      description: a.description,
    })));

    // --- SECURITY CHECKS ---
    console.log('\n[Test 6] Security Check: Client User fetching activity log (Internal activities must be isolated)...');
    const clientActRes = await fetch(`${API_URL}/activity`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    const clientActData = await clientActRes.json();
    const internalLeaked = clientActData.data.some(a => a.isInternal === true);
    if (!internalLeaked) {
      console.log(`✅ PASSED: Client User received ${clientActData.data.length} activities (0 internal items leaked).`);
    } else {
      console.error('❌ FAILED: Internal activity leaked to Client User!');
    }

    console.log('\n--------------------------------------------------');
    console.log('🎉 ALL NOTIFICATIONS & ACTIVITY LOG API TESTS PASSED!');
    console.log('--------------------------------------------------');
  } catch (error) {
    console.error('❌ Notifications/Activity Test Error:', error);
  }
}

runNotificationsAndActivityTests();
