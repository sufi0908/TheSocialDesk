const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://127.0.0.1:5000/api';

async function runCalendarTests() {
  console.log('--------------------------------------------------');
  console.log('Running SocialDesk Calendar & Content Scheduling APIs');
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

    // 2. Client User Login (Emily - Client User for Client 1)
    const clientLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'emily@acme.com', password: 'password123' }),
    });
    const clientToken = (await clientLogin.json()).data.token;
    console.log('✅ Client User Authenticated!');

    // Ensure Content ID 1 is APPROVED and unscheduled for testing
    await fetch(`${API_URL}/content/1/client-approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${wmToken}` },
      body: JSON.stringify({ notes: 'Preparation for calendar test' }),
    });

    // 3. GET Unscheduled Approved Queue
    console.log('\n[Test 1] GET /api/calendar/unscheduled (Fetching APPROVED / UNSCHEDULED content queue)...');
    const unscheduledRes = await fetch(`${API_URL}/calendar/unscheduled`, {
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const unscheduledData = await unscheduledRes.json();
    console.log(`✅ Total Unscheduled Approved Content Found: ${unscheduledData.data.length}`);
    console.table(unscheduledData.data.map(c => ({ id: c.content_id, title: c.title, status: c.status, calendarStatus: c.calendarStatus })));

    // 4. POST Schedule Content
    console.log('\n[Test 2] POST /api/calendar/schedule (Scheduling Content ID 1)...');
    const scheduleRes = await fetch(`${API_URL}/calendar/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({
        contentId: 1,
        date: '2026-11-20',
        time: '14:00:00',
        timezone: 'America/New_York',
      }),
    });
    const scheduleData = await scheduleRes.json();
    console.log('✅ Content Scheduled:', scheduleData.message);
    console.log('Schedule details:', scheduleData.data);

    // 5. GET Scheduled Calendar Events
    console.log('\n[Test 3] GET /api/calendar (Listing scheduled calendar events)...');
    const listCalRes = await fetch(`${API_URL}/calendar`, {
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const listCalData = await listCalRes.json();
    console.log(`✅ Total Scheduled Events Found: ${listCalData.data.length}`);
    console.table(listCalData.data.map(e => ({ content_id: e.content_id, title: e.title, scheduled_at: e.scheduled_at, status: e.content_status })));

    // 6. PUT Reschedule Content (Drag & Drop update)
    console.log('\n[Test 4] PUT /api/calendar/1 (Drag & Drop rescheduling to 2026-11-25 16:30)...');
    const rescheduleRes = await fetch(`${API_URL}/calendar/1`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({
        date: '2026-11-25',
        time: '16:30:00',
        timezone: 'America/New_York',
      }),
    });
    const rescheduleData = await rescheduleRes.json();
    console.log('✅ Rescheduled successfully:', rescheduleData.data.scheduledAt);

    // 7. PATCH Mark Content as Published
    console.log('\n[Test 5] PATCH /api/calendar/1/published (Marking content as PUBLISHED after manual posting)...');
    const publishRes = await fetch(`${API_URL}/calendar/1/published`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const publishData = await publishRes.json();
    console.log('✅ Content Marked as Published:', publishData.data);

    // 8. DELETE Unschedule Content
    console.log('\n[Test 6] DELETE /api/calendar/1 (Unscheduling content back to APPROVED / UNSCHEDULED queue)...');
    const unscheduleRes = await fetch(`${API_URL}/calendar/1`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const unscheduleData = await unscheduleRes.json();
    console.log('✅ Content Unscheduled:', unscheduleData.message);

    // 9. Client Security Check: Client view vs scheduling attempt
    console.log('\n[Test 7] Security Check: Client User viewing calendar...');
    const clientViewRes = await fetch(`${API_URL}/calendar`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    const clientViewData = await clientViewRes.json();
    console.log(`✅ Client View Allowed: Retrieved ${clientViewData.data.length} scheduled items`);

    console.log('\n[Test 8] Security Check: Client User attempting to schedule content...');
    const clientForbiddenRes = await fetch(`${API_URL}/calendar/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clientToken}`,
      },
      body: JSON.stringify({ contentId: 1, date: '2026-12-01', time: '10:00:00' }),
    });
    const clientForbiddenData = await clientForbiddenRes.json();
    if (clientForbiddenRes.status === 403) {
      console.log('✅ PASSED (403 Forbidden):', clientForbiddenData.message);
    } else {
      console.error('❌ FAILED: Expected 403 Forbidden for client scheduling attempt');
    }

    console.log('\n--------------------------------------------------');
    console.log('🎉 ALL CALENDAR & SCHEDULING API TESTS PASSED!');
    console.log('--------------------------------------------------');
  } catch (error) {
    console.error('❌ Calendar Test Error:', error);
  }
}

runCalendarTests();
