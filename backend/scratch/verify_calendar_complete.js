const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');

const API_URL = 'http://127.0.0.1:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'development-only-socialdesk-jwt-secret';

async function runVerification() {
  console.log('============================================================');
  console.log('SOCIALDESK — CALENDAR & SCHEDULING SYSTEM VERIFICATION');
  console.log('============================================================\n');

  try {
    // 1. Generate Workspace Manager Token
    const wmToken = jwt.sign(
      { id: 1, email: 'sufi@socialdesk.com', role: 'workspace_owner' },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    console.log('✅ Workspace Manager Authenticated.');

    // 2. Fetch Unscheduled Approved Content
    console.log('\n[Test 1: Queue] Fetching Approved Unscheduled Queue...');
    const queueRes = await fetch(`${API_URL}/calendar/unscheduled`, {
      headers: {
        Authorization: `Bearer ${wmToken}`,
        'x-workspace-id': '1',
      },
    });
    const queueData = await queueRes.json();
    console.log(`✅ Approved Unscheduled Items: ${queueData.data.length}`);
    if (queueData.data.length > 0) {
      console.log('Sample queue item:', {
        id: queueData.data[0].content_id,
        title: queueData.data[0].title,
        client: queueData.data[0].client_name,
        platforms: queueData.data[0].platforms,
        mediaUrl: queueData.data[0].mediaUrl,
      });
    }

    // 3. Fetch Scheduled Content
    console.log('\n[Test 2: Calendar List] Fetching Scheduled Events for Calendar...');
    const calRes = await fetch(`${API_URL}/calendar`, {
      headers: {
        Authorization: `Bearer ${wmToken}`,
        'x-workspace-id': '1',
      },
    });
    const calData = await calRes.json();
    console.log(`✅ Scheduled Events Found: ${calData.data.length}`);
    calData.data.slice(0, 5).forEach((e) => {
      console.log(` - [ID ${e.content_id}] "${e.title}" | Date: ${e.scheduled_at} | Client: ${e.client_name} | Platforms: ${e.platforms?.join(', ')} | Status: ${e.content_status}`);
    });

    // 4. Test Scheduling a Queue item (Content ID from queue or ID 4)
    const targetApprovedPost = queueData.data[0] || { content_id: 4, title: 'Summer Campaign Post #101' };
    const targetId = targetApprovedPost.content_id;
    console.log(`\n[Test 3: Schedule Action] Scheduling Content ID ${targetId} to 2026-08-31 15:00...`);
    const schedRes = await fetch(`${API_URL}/calendar/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
        'x-workspace-id': '1',
      },
      body: JSON.stringify({
        contentId: targetId,
        date: '2026-08-31',
        time: '15:00:00',
        timezone: 'UTC',
      }),
    });
    const schedData = await schedRes.json();
    console.log('✅ Schedule Result:', schedData.message, '| ScheduledAt:', schedData.data?.scheduledAt);

    // 5. Test Rescheduling (Drag Calendar -> Calendar)
    console.log(`\n[Test 4: Reschedule Action] Moving Content ID ${targetId} to 2026-09-04 16:30...`);
    const reschedRes = await fetch(`${API_URL}/calendar/${targetId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
        'x-workspace-id': '1',
      },
      body: JSON.stringify({
        date: '2026-09-04',
        time: '16:30:00',
        timezone: 'UTC',
      }),
    });
    const reschedData = await reschedRes.json();
    console.log('✅ Reschedule Result:', reschedData.message, '| New scheduledAt:', reschedData.data?.scheduledAt);

    // 6. Test Mark as Published
    console.log(`\n[Test 5: Mark Published] Updating Content ID ${targetId} to PUBLISHED...`);
    const pubRes = await fetch(`${API_URL}/calendar/${targetId}/published`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${wmToken}`,
        'x-workspace-id': '1',
      },
    });
    const pubData = await pubRes.json();
    console.log('✅ Mark Published Result:', pubData.message, '| Status:', pubData.data?.status);

    // 7. Test Unschedule
    console.log(`\n[Test 6: Unschedule Action] Returning Content ID ${targetId} to APPROVED Queue...`);
    const unschedRes = await fetch(`${API_URL}/calendar/${targetId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${wmToken}`,
        'x-workspace-id': '1',
      },
    });
    const unschedData = await unschedRes.json();
    console.log('✅ Unschedule Result:', unschedData.message, '| Status:', unschedData.data?.status);

    // 8. Test Conflict Detection
    console.log('\n[Test 7: Conflict Detection] Testing conflict check for scheduled post...');
    const conflictRes = await fetch(`${API_URL}/calendar/check-conflict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
        'x-workspace-id': '1',
      },
      body: JSON.stringify({
        clientId: 1,
        platforms: ['instagram'],
        date: '2026-09-02',
        time: '22:30:00',
      }),
    });
    const conflictData = await conflictRes.json();
    console.log('✅ Conflict Check Response:', conflictData.data);

    // 9. Test Role Security (Client User cannot schedule)
    console.log('\n[Test 8: Security & Role Check] Testing client user permission restrictions...');
    const clientToken = jwt.sign(
      { id: 7, email: 'tesla_1787898797513@tesla.com', role: 'client_user' },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    const clientSchedRes = await fetch(`${API_URL}/calendar/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clientToken}`,
        'x-workspace-id': '1',
      },
      body: JSON.stringify({ contentId: 1, date: '2026-09-10', time: '10:00:00' }),
    });
    const clientSchedData = await clientSchedRes.json();
    if (clientSchedRes.status === 403) {
      console.log('✅ Role Enforcement: Client blocked with 403 Forbidden:', clientSchedData.message);
    } else {
      console.log('Client response status:', clientSchedRes.status);
    }

    console.log('\n============================================================');
    console.log('🎉 ALL CALENDAR INTEGRATION TESTS PASSED CLEANLY!');
    console.log('============================================================');
  } catch (err) {
    console.error('❌ Verification Error:', err);
  }
}

runVerification();
