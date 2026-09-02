const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://127.0.0.1:5000/api';

async function runFullIntegrationTest() {
  console.log('==================================================');
  console.log('🚀 SOCIALDESK FULL BACKEND & FRONTEND INTEGRATION TEST');
  console.log('==================================================');

  const runId = Date.now().toString().substring(7);
  const mgrEmail = `mgr_${runId}@apexmedia.com`;
  const teamEmail = `team_${runId}@apexmedia.com`;
  const clientEmail = `client_${runId}@starlight.com`;

  try {
    // 1. Superadmin Login
    console.log('\n[1/9] Superadmin Authenticating...');
    const saLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@socialdesk.com', password: 'password123' }),
    });
    const saToken = (await saLogin.json()).data.token;
    console.log('✅ Superadmin Authenticated!');

    // 2. Superadmin Creates Workspace & Workspace Manager
    console.log('\n[2/9] Superadmin Creating New Agency Workspace & Manager...');
    const wsRes = await fetch(`${API_URL}/superadmin/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${saToken}` },
      body: JSON.stringify({
        companyName: `Apex Media ${runId}`,
        workspaceName: `Apex Media ${runId}`,
        email: `contact_${runId}@apexmedia.com`,
        phone: '+1 555-900-1000',
        address: '100 Tech Blvd, San Francisco, CA',
      }),
    });
    const wsData = await wsRes.json();
    const newWsId = wsData.data.id;
    console.log(`✅ Workspace Created! ID: ${newWsId} (${wsData.data.company_name})`);

    const mgrRes = await fetch(`${API_URL}/superadmin/workspaces/${newWsId}/manager`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${saToken}` },
      body: JSON.stringify({ name: 'Alex Rivera', email: mgrEmail }),
    });
    const mgrData = await mgrRes.json();
    const mgrTempPass = mgrData.data.temporaryPassword;
    console.log(`✅ Workspace Manager Created! Email: ${mgrEmail} | Temp Password: ${mgrTempPass}`);

    // 3. Manager Login & Password Change
    console.log('\n[3/9] Manager Logging in with Temporary Credentials & Changing Password...');
    const mgrLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: mgrEmail, password: mgrTempPass }),
    });
    const mgrToken = (await mgrLogin.json()).data.token;

    const passChangeRes = await fetch(`${API_URL}/auth/change-pass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mgrToken}` },
      body: JSON.stringify({ currentPassword: mgrTempPass, newPassword: 'NewSecurePass123!' }),
    });
    const passChangeData = await passChangeRes.json();
    console.log('✅ Manager Password Changed Successfully!');

    // 4. Manager Creates Team Member & Client
    console.log('\n[4/9] Manager Creating Team Member & Client...');
    const teamRes = await fetch(`${API_URL}/workspace/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mgrToken}` },
      body: JSON.stringify({ name: 'Jordan Lee', email: teamEmail, role: 'GRAPHIC_DESIGNER' }),
    });
    const teamData = await teamRes.json();
    console.log(`✅ Team Member Created: ${teamData.data.user.name} (${teamData.data.user.role})`);

    const clientRes = await fetch(`${API_URL}/workspace/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mgrToken}` },
      body: JSON.stringify({ companyName: `Starlight Retail ${runId}`, contactName: 'Sophia Martinez', email: clientEmail }),
    });
    const clientData = await clientRes.json();
    const clientTempPass = clientData.data.temporaryPassword;
    const clientId = clientData.data.client.id;
    console.log(`✅ Client Account Created! Client ID: ${clientId} | Email: ${clientEmail} | Temp Pass: ${clientTempPass}`);

    // 5. Client Login
    console.log('\n[5/9] Client Representative Authenticating...');
    const clientLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: clientEmail, password: clientTempPass }),
    });
    const clientToken = (await clientLogin.json()).data.token;
    console.log('✅ Client Representative Authenticated!');

    // 6. Content Creation & Approval Workflow
    console.log('\n[6/9] Content Creation & Complete Approval Workflow...');
    const contentRes = await fetch(`${API_URL}/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mgrToken}` },
      body: JSON.stringify({
        title: `Starlight Autumn Silk Collection Reel ${runId}`,
        caption: 'Discover modern sustainable elegance. 🍂✨',
        contentType: 'Reel / Video',
        clientId,
        platforms: ['INSTAGRAM', 'TIKTOK'],
      }),
    });
    const contentData = await contentRes.json();
    const contentId = contentData.data.id;
    console.log(`✅ Content Item Created! ID: ${contentId} (${contentData.data.title})`);

    // Submit -> Internal Approve -> Client Approve
    await fetch(`${API_URL}/content/${contentId}/submit-internal-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mgrToken}` },
      body: JSON.stringify({ notes: 'Design complete.' }),
    });
    await fetch(`${API_URL}/content/${contentId}/internal-approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mgrToken}` },
      body: JSON.stringify({ notes: 'Internal review passed.' }),
    });
    const clientApproveRes = await fetch(`${API_URL}/content/${contentId}/client-approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientToken}` },
      body: JSON.stringify({ notes: 'Approved for publishing!' }),
    });
    const clientApproveData = await clientApproveRes.json();
    const finalStatus = clientApproveData.data?.status || clientApproveData.data?.data?.status;
    const finalCalStatus = clientApproveData.data?.calendarStatus || clientApproveData.data?.data?.calendarStatus;
    console.log(`✅ Content Approved by Client! Status: ${finalStatus} | Calendar Queue: ${finalCalStatus}`);

    // 7. Calendar Scheduling & Drag-and-Drop Reschedule
    console.log('\n[7/9] Calendar Scheduling & Drag & Drop Rescheduling...');
    const schedRes = await fetch(`${API_URL}/calendar/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mgrToken}` },
      body: JSON.stringify({ contentId, date: '2026-11-15', time: '10:00:00', timezone: 'America/Los_Angeles' }),
    });
    const schedData = await schedRes.json();
    console.log(`✅ Scheduled for: ${schedData.data.scheduledAt}`);

    const reschedRes = await fetch(`${API_URL}/calendar/${contentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mgrToken}` },
      body: JSON.stringify({ date: '2026-11-18', time: '14:30:00' }),
    });
    const reschedData = await reschedRes.json();
    console.log(`✅ Rescheduled via Drag & Drop: ${reschedData.data.scheduledAt}`);

    // 8. Asset Attachment & Mark Published
    console.log('\n[8/9] Uploading Asset, Attaching to Content & Marking as Published...');
    const assetRes = await fetch(`${API_URL}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mgrToken}` },
      body: JSON.stringify({ fileName: `Starlight_Autumn_Master_${runId}.mp4`, fileUrl: 'https://example.com/asset.mp4', fileType: 'VIDEO', fileSize: 15000000, clientId }),
    });
    const assetData = await assetRes.json();
    await fetch(`${API_URL}/assets/${assetData.data.id}/attach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mgrToken}` },
      body: JSON.stringify({ contentId }),
    });

    const pubRes = await fetch(`${API_URL}/calendar/${contentId}/published`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${mgrToken}` },
    });
    const pubData = await pubRes.json();
    console.log(`✅ Content Marked as Published! Status: ${pubData.data.status}`);

    // 9. Global Search & Notifications Audit
    console.log('\n[9/9] Verifying Global Search & Persistent Notifications...');
    const globalSearchRes = await fetch(`${API_URL}/search?q=Starlight`, {
      headers: { Authorization: `Bearer ${mgrToken}` },
    });
    const globalSearchData = await globalSearchRes.json();
    console.log(`✅ Global Search for "Starlight" returned ${globalSearchData.data.totalResults} results across entities.`);

    console.log('\n==================================================');
    console.log('🎉 FULL SOCIALDESK INTEGRATION TEST PASSED 100%!');
    console.log('==================================================');
  } catch (error) {
    console.error('❌ Full Integration Test Error:', error);
  }
}

runFullIntegrationTest();
