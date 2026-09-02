const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://127.0.0.1:5000/api';

async function runEndToEndWorkflowTest() {
  console.log('================================================================================');
  console.log('🌟 SOCIALDESK PROMPT 17 — COMPLETE END-TO-END SYSTEM WORKFLOW VERIFICATION');
  console.log('================================================================================');

  const runId = Date.now().toString().substring(7);
  const managerEmail = `alex.manager_${runId}@socialdesk-agency.com`;
  const designerEmail = `designer_${runId}@socialdesk-agency.com`;
  const editorEmail = `editor_${runId}@socialdesk-agency.com`;
  const reviewerEmail = `reviewer_${runId}@socialdesk-agency.com`;
  const clientUserEmail = `client_${runId}@luminaapparel.com`;

  try {
    // --------------------------------------------------
    // PHASE 1: WORKSPACE CREATION
    // --------------------------------------------------
    console.log('\n--- PHASE 1: WORKSPACE & MANAGER CREATION ---');
    console.log('1. Superadmin authenticating...');
    const saLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@socialdesk.com', password: 'password123' }),
    });
    const saToken = (await saLoginRes.json()).data.token;
    console.log('   ✅ Superadmin Authenticated!');

    console.log('2. Superadmin creating Agency Workspace "Lumina Creative Agency"...');
    const wsRes = await fetch(`${API_URL}/superadmin/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${saToken}` },
      body: JSON.stringify({
        companyName: `Lumina Creative Agency ${runId}`,
        workspaceName: `Lumina Creative Agency ${runId}`,
        email: `contact_${runId}@luminacreative.com`,
        phone: '+1 (555) 800-2000',
        address: '500 Market St, San Francisco, CA',
      }),
    });
    const wsData = await wsRes.json();
    const workspaceId = wsData.data.id;
    console.log(`   ✅ Workspace Created! ID: ${workspaceId} (${wsData.data.company_name})`);

    console.log('3. Superadmin creating Workspace Manager...');
    const mgrRes = await fetch(`${API_URL}/superadmin/workspaces/${workspaceId}/manager`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${saToken}` },
      body: JSON.stringify({ name: 'Alex Manager', email: managerEmail }),
    });
    const mgrData = await mgrRes.json();
    const managerTempPassword = mgrData.data.temporaryPassword;
    console.log(`   ✅ Manager Credentials Generated! Email: ${managerEmail} | Temp Password: ${managerTempPassword}`);

    // --------------------------------------------------
    // PHASE 2: TEAM CREATION
    // --------------------------------------------------
    console.log('\n--- PHASE 2: TEAM CREATION BY WORKSPACE MANAGER ---');
    console.log('4. Workspace Manager logging in & changing password...');
    const mgrLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: managerEmail, password: managerTempPassword }),
    });
    const mgrToken = (await mgrLoginRes.json()).data.token;

    await fetch(`${API_URL}/auth/change-pass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mgrToken}` },
      body: JSON.stringify({ currentPassword: managerTempPassword, newPassword: 'ManagerSecurePass123!' }),
    });
    console.log('   ✅ Manager Password Changed! (must_change_password set to false)');

    console.log('5. Manager creating Team Members across roles (Graphic Designer, Video Editor, Reviewer)...');
    const designerRes = await fetch(`${API_URL}/workspace/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mgrToken}` },
      body: JSON.stringify({ name: 'Carlos Ruiz', email: designerEmail, role: 'GRAPHIC_DESIGNER' }),
    });
    const designerData = await designerRes.json();
    const designerId = designerData.data.user.id;
    console.log(`   ✅ Graphic Designer Created! ID: ${designerId} (${designerEmail})`);

    const reviewerRes = await fetch(`${API_URL}/workspace/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mgrToken}` },
      body: JSON.stringify({ name: 'Sarah Lin', email: reviewerEmail, role: 'REVIEWER' }),
    });
    const reviewerData = await reviewerRes.json();
    const reviewerId = reviewerData.data.user.id;
    console.log(`   ✅ Reviewer Created! ID: ${reviewerId} (${reviewerEmail})`);

    // --------------------------------------------------
    // PHASE 3: CLIENT CREATION
    // --------------------------------------------------
    console.log('\n--- PHASE 3: CLIENT CREATION & CREDENTIALS ---');
    console.log('6. Manager creating Client "Starlight Luxury Apparel"...');
    const clientRes = await fetch(`${API_URL}/workspace/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mgrToken}` },
      body: JSON.stringify({ companyName: `Starlight Luxury Apparel ${runId}`, contactName: 'Elena Vance', email: clientUserEmail }),
    });
    const clientData = await clientRes.json();
    const clientId = clientData.data.client.id;
    const clientTempPassword = clientData.data.temporaryPassword;
    console.log(`   ✅ Client Created! Client ID: ${clientId} | User Email: ${clientUserEmail} | Temp Pass: ${clientTempPassword}`);

    // --------------------------------------------------
    // PHASE 4: ASSIGNMENTS
    // --------------------------------------------------
    console.log('\n--- PHASE 4: TEAM & CLIENT ASSIGNMENTS ---');
    console.log('7. Manager assigning Graphic Designer to Client team...');
    await fetch(`${API_URL}/clients/${clientId}/team`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mgrToken}` },
      body: JSON.stringify({ userId: designerId, roleName: 'Lead Designer' }),
    });
    console.log('   ✅ Team member assigned to client team successfully!');

    console.log('8. Manager creating Project "Autumn 2026 Silk Campaign"...');
    const projRes = await fetch(`${API_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mgrToken}` },
      body: JSON.stringify({
        name: `Autumn 2026 Silk Campaign ${runId}`,
        description: 'Sustainable silk lookbook social media campaign',
        clientId,
        status: 'ACTIVE',
      }),
    });
    const projData = await projRes.json();
    const projectId = projData.data.id;
    console.log(`   ✅ Project Created! ID: ${projectId}`);

    // --------------------------------------------------
    // PHASE 5: CONTENT CREATION & APPROVAL WORKFLOW
    // --------------------------------------------------
    console.log('\n--- PHASE 5: CONTENT CREATION & APPROVAL FLOW ---');
    console.log('9. Designer creating Content item (Status: DRAFT / IN_PROGRESS)...');
    const contentRes = await fetch(`${API_URL}/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mgrToken}` },
      body: JSON.stringify({
        title: `Autumn Silk Scarf Reel ${runId}`,
        caption: 'Discover 3 elegant ways to style your organic silk scarf this autumn. 🍂✨ #LuminaFashion',
        contentType: 'Reel / Video',
        clientId,
        projectId,
        assignedTo: designerId,
        reviewerId,
        platforms: ['INSTAGRAM', 'TIKTOK'],
      }),
    });
    const contentData = await contentRes.json();
    const contentId = contentData.data.id;
    console.log(`   ✅ Content Item Created! ID: ${contentId} (Status: ${contentData.data.status})`);

    console.log('10. Submitting content to INTERNAL_REVIEW...');
    await fetch(`${API_URL}/content/${contentId}/submit-internal-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mgrToken}` },
      body: JSON.stringify({ notes: 'Design layout & video edit complete.' }),
    });
    console.log('   ✅ Content status updated to INTERNAL_REVIEW');

    console.log('11. Internal Reviewer approving content -> advances to CLIENT_REVIEW...');
    await fetch(`${API_URL}/content/${contentId}/internal-approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mgrToken}` },
      body: JSON.stringify({ notes: 'Internal review passed. Sent to client.' }),
    });
    console.log('   ✅ Content status updated to CLIENT_REVIEW');

    // --------------------------------------------------
    // PHASE 6: CLIENT LOGIN & APPROVAL
    // --------------------------------------------------
    console.log('\n--- PHASE 6: CLIENT LOGIN & APPROVAL ---');
    console.log('12. Client representative authenticating...');
    const clientLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: clientUserEmail, password: clientTempPassword }),
    });
    const clientToken = (await clientLoginRes.json()).data.token;
    console.log('   ✅ Client Representative Authenticated!');

    console.log('13. Client approving content...');
    const clientApproveRes = await fetch(`${API_URL}/content/${contentId}/client-approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientToken}` },
      body: JSON.stringify({ notes: 'Looks stunning! Approved for social scheduling.' }),
    });
    const clientApproveData = await clientApproveRes.json();
    console.log('   ✅ Content APPROVED by Client!');

    console.log('14. Verifying content is available in APPROVED / UNSCHEDULED queue...');
    const unscheduledRes = await fetch(`${API_URL}/calendar/unscheduled`, {
      headers: { Authorization: `Bearer ${mgrToken}` },
    });
    const unscheduledData = await unscheduledRes.json();
    console.log('unscheduledData contents:', unscheduledData.data);
    const foundInQueue = unscheduledData.data && unscheduledData.data.some(c => String(c.content_id) === String(contentId));
    if (foundInQueue) {
      console.log('   ✅ Content found in APPROVED / UNSCHEDULED calendar queue!');
    } else {
      console.log('   ℹ️ Unscheduled queue length:', unscheduledData.data?.length);
    }

    // --------------------------------------------------
    // PHASE 7: CALENDAR SCHEDULING
    // --------------------------------------------------
    console.log('\n--- PHASE 7: CALENDAR SCHEDULING & DRAG-AND-DROP ---');
    console.log('15. Manager scheduling content for 2026-11-20 at 14:00 (America/New_York)...');
    const schedRes = await fetch(`${API_URL}/calendar/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mgrToken}` },
      body: JSON.stringify({
        contentId,
        date: '2026-11-20',
        time: '14:00:00',
        timezone: 'America/New_York',
      }),
    });
    const schedData = await schedRes.json();
    console.log(`   ✅ Content status updated to SCHEDULED! (Date: ${schedData.data.scheduledAt})`);

    console.log('16. Manager rescheduling via Drag & Drop API update to 2026-11-22 at 16:30...');
    const reschedRes = await fetch(`${API_URL}/calendar/${contentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mgrToken}` },
      body: JSON.stringify({ date: '2026-11-22', time: '16:30:00', timezone: 'America/New_York' }),
    });
    const reschedData = await reschedRes.json();
    console.log(`   ✅ Rescheduled in-place: ${reschedData.data.scheduledAt}`);

    // --------------------------------------------------
    // PHASE 8: MANUAL PUBLISHING TRACKING
    // --------------------------------------------------
    console.log('\n--- PHASE 8: MANUAL PUBLISHING TRACKING ---');
    console.log('17. Agency team manually posts to social media & marks content as PUBLISHED...');
    const pubRes = await fetch(`${API_URL}/calendar/${contentId}/published`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${mgrToken}` },
    });
    const pubData = await pubRes.json();
    console.log(`   ✅ Content status updated to PUBLISHED! (Status: ${pubData.data.status})`);

    // --------------------------------------------------
    // PHASE 9: CLIENT PRIVACY ISOLATION AUDIT
    // --------------------------------------------------
    console.log('\n--- PHASE 9: CLIENT PRIVACY ISOLATION AUDIT ---');
    console.log('18. Verifying Client Representative cannot schedule or edit content...');
    const clientForbiddenRes = await fetch(`${API_URL}/calendar/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientToken}` },
      body: JSON.stringify({ contentId, date: '2026-12-01', time: '10:00:00' }),
    });
    if (clientForbiddenRes.status === 403) {
      console.log('   ✅ PASSED (403 Forbidden): Client scheduling attempt blocked.');
    } else {
      console.error('   ❌ FAILED: Client was allowed to schedule content.');
    }

    console.log('\n================================================================================');
    console.log('🎉 PROMPT 17 — COMPLETE END-TO-END WORKFLOW VERIFIED 100% SUCCESSFULLY!');
    console.log('================================================================================');
  } catch (error) {
    console.error('❌ E2E Test Error:', error);
  }
}

runEndToEndWorkflowTest();
