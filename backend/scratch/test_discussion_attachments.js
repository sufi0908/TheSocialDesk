const { db } = require('../src/config/database');
const taskService = require('../src/services/taskService');
const assetService = require('../src/services/assetService');
const fs = require('fs');
const path = require('path');

async function runDiscussionAndAttachmentsTests() {
  console.log('============================================================');
  console.log('STARTING SOCIALDESK DISCUSSION & ATTACHMENTS VERIFICATION');
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

  let createdTaskId = null;
  let testAssetIds = [];

  try {
    const workspaceId = 1;
    const [users] = await db.query('SELECT id, full_name, email FROM users WHERE id IN (2, 6, 9)');
    const manager = { ...users.find((u) => u.id === 2), role: 'workspace_manager' };
    const designer = { ...users.find((u) => u.id === 6), role: 'graphic_designer' };
    const graphicHead = { ...users.find((u) => u.id === 9), role: 'graphic_team_head' };

    const [clientRows] = await db.query('SELECT id, name, company_name FROM clients WHERE workspace_id = ? LIMIT 1', [workspaceId]);
    const client = clientRows[0] || { id: 1, name: 'Glamira' };

    console.log(`Actors:`);
    console.log(`  Creator/Manager: ${manager.full_name} (ID: ${manager.id})`);
    console.log(`  Assignee: ${designer.full_name} (ID: ${designer.id})`);
    console.log(`  Second Assignee / Head: ${graphicHead.full_name} (ID: ${graphicHead.id})\n`);

    // ============================================================
    // TEST 1 — CREATE & ASSIGN
    // ============================================================
    console.log('--- TEST 1: Manager Creates Task "Glamira FB Posting" ---');
    const created = await taskService.createTask(manager, workspaceId, {
      title: 'Glamira FB Posting',
      description: 'Prepare Facebook creative for the Glamira campaign.',
      instructions: 'Use 1080x1350 format and follow approved brand guidelines.',
      clientId: client.id,
      assignedTo: designer.id,
      priority: 'HIGH',
      dueDate: '2026-09-05',
      dueTime: '17:00',
    });

    createdTaskId = created.id;
    assert(created && created.id > 0, `Task created in MySQL with ID: ${created.id}`);
    assert(Number(created.assigned_to) === Number(designer.id), `assigned_to persists as real user ID (${designer.id})`);
    assert(created.priority === 'HIGH', `Priority saved as HIGH`);

    const myTasks = await taskService.getMyTasks(designer, workspaceId);
    const found = myTasks.find((t) => t.id === createdTaskId);
    assert(found !== undefined, `Task appears in Abu Sufyan's My Tasks list`);

    const [assignNotifs] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? AND related_task_id = ? AND type = "TASK_ASSIGNED"',
      [designer.id, createdTaskId]
    );
    assert(assignNotifs.length >= 1, `Abu Sufyan received persistent TASK_ASSIGNED notification in MySQL`);

    // ============================================================
    // TEST 2 & 3 — CREATOR & ASSIGNEE DETAILS VIEWS
    // ============================================================
    console.log('\n--- TEST 2 & 3: Task Details API Scoping ---');
    const taskDetails = await taskService.getTask(workspaceId, createdTaskId);
    assert(taskDetails.title === 'Glamira FB Posting', `Task title correctly retrieved: "${taskDetails.title}"`);
    assert(taskDetails.assigneeName === designer.full_name, `Assignee name populated: "${taskDetails.assigneeName}"`);
    assert(taskDetails.creatorName === manager.full_name, `Creator name populated: "${taskDetails.creatorName}"`);
    assert(taskDetails.instructions.length > 0, `Instructions populated: "${taskDetails.instructions}"`);
    assert(Array.isArray(taskDetails.attachments), `Attachments array present`);
    assert(Array.isArray(taskDetails.comments), `Comments array present`);
    assert(Array.isArray(taskDetails.activity), `Activity array present`);

    // ============================================================
    // TEST 4 — COMMENT BY ASSIGNEE
    // ============================================================
    console.log('\n--- TEST 4: Assignee Posts Comment ---');
    const comment1 = await taskService.addComment(designer, workspaceId, createdTaskId, 'Here is the first version.');
    assert(comment1 && comment1.id > 0, `Comment 1 saved in MySQL with ID: ${comment1.id}`);
    assert(comment1.text === 'Here is the first version.', `Comment text matches: "${comment1.text}"`);
    assert(comment1.user.name === designer.full_name, `Comment author formatted: "${comment1.user.name}"`);

    // Verify notification sent to Manager (and NOT to commenter)
    const [managerCommentNotifs] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? AND related_task_id = ? AND type = "TASK_COMMENT"',
      [manager.id, createdTaskId]
    );
    assert(managerCommentNotifs.length >= 1, `Manager received TASK_COMMENT notification`);

    const [selfNotifs] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? AND related_task_id = ? AND type = "TASK_COMMENT"',
      [designer.id, createdTaskId]
    );
    assert(selfNotifs.length === 0, `Commenter was correctly NOT notified of their own comment`);

    // ============================================================
    // TEST 5 — SECOND USER SEES COMMENT & REPLIES
    // ============================================================
    console.log('\n--- TEST 5: Manager Reads Discussion & Replies ---');
    const commentsList = await taskService.getTaskComments(workspaceId, createdTaskId);
    assert(commentsList.length === 1 && commentsList[0].text === 'Here is the first version.', `Manager retrieves discussion thread with Abu Sufyan's comment`);

    const comment2 = await taskService.addComment(manager, workspaceId, createdTaskId, 'Looks good. Continue with the next version.');
    assert(comment2 && comment2.id > 0, `Manager comment saved in MySQL with ID: ${comment2.id}`);

    const [designerReplyNotifs] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? AND related_task_id = ? AND type = "TASK_COMMENT"',
      [designer.id, createdTaskId]
    );
    assert(designerReplyNotifs.length >= 1, `Abu Sufyan received TASK_COMMENT notification for Manager's reply`);

    // ============================================================
    // TEST 6 — IMAGE ATTACHMENT
    // ============================================================
    console.log('\n--- TEST 6: Upload Image Attachment (design.jpg) ---');
    // Create dummy test file in uploads/
    const uploadsDir = path.resolve(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const imgPath = path.join(uploadsDir, 'test_design.jpg');
    fs.writeFileSync(imgPath, Buffer.from('FAKE_JPEG_IMAGE_CONTENT_FOR_TESTING'));

    const imgAsset = await assetService.createUploadedAsset(designer, workspaceId, {
      originalname: 'design.jpg',
      mimetype: 'image/jpeg',
      size: 2457600,
      path: imgPath,
    }, { category: 'TASK_ATTACHMENT' });
    testAssetIds.push(imgAsset.id);

    const imgAttachment = await taskService.addAttachment(designer, workspaceId, createdTaskId, {
      fileName: imgAsset.file_name,
      fileUrl: imgAsset.file_url,
      fileType: 'image/jpeg',
      fileSize: 2457600,
      assetId: imgAsset.id,
      attachmentType: 'REFERENCE',
    });

    assert(imgAttachment && imgAttachment.id > 0, `Image attachment created with ID: ${imgAttachment.id}`);
    assert(imgAttachment.type === 'image', `Attachment type identified as 'image'`);
    assert(imgAttachment.fileUrl.startsWith('/api/assets/'), `Usable real file URL generated: ${imgAttachment.fileUrl}`);

    // ============================================================
    // TEST 7 — VIDEO ATTACHMENT
    // ============================================================
    console.log('\n--- TEST 7: Upload Video Attachment (design.mp4) ---');
    const vidPath = path.join(uploadsDir, 'test_design.mp4');
    fs.writeFileSync(vidPath, Buffer.from('FAKE_MP4_VIDEO_CONTENT_FOR_TESTING'));

    const vidAsset = await assetService.createUploadedAsset(designer, workspaceId, {
      originalname: 'design.mp4',
      mimetype: 'video/mp4',
      size: 12582912,
      path: vidPath,
    }, { category: 'TASK_ATTACHMENT' });
    testAssetIds.push(vidAsset.id);

    const vidAttachment = await taskService.addAttachment(designer, workspaceId, createdTaskId, {
      fileName: vidAsset.file_name,
      fileUrl: vidAsset.file_url,
      fileType: 'video/mp4',
      fileSize: 12582912,
      assetId: vidAsset.id,
      attachmentType: 'SUBMISSION',
    });

    assert(vidAttachment && vidAttachment.id > 0, `Video attachment created with ID: ${vidAttachment.id}`);
    assert(vidAttachment.type === 'video', `Attachment type identified as 'video'`);
    assert(vidAttachment.attachmentType === 'SUBMISSION', `Work submission attachment tag saved`);

    // ============================================================
    // TEST 8 — DOCUMENT / PDF ATTACHMENT
    // ============================================================
    console.log('\n--- TEST 8: Upload Document Attachment (brief.pdf) ---');
    const pdfPath = path.join(uploadsDir, 'test_brief.pdf');
    fs.writeFileSync(pdfPath, Buffer.from('FAKE_PDF_CONTENT_FOR_TESTING'));

    const pdfAsset = await assetService.createUploadedAsset(manager, workspaceId, {
      originalname: 'brief.pdf',
      mimetype: 'application/pdf',
      size: 1048576,
      path: pdfPath,
    }, { category: 'TASK_ATTACHMENT' });
    testAssetIds.push(pdfAsset.id);

    const pdfAttachment = await taskService.addAttachment(manager, workspaceId, createdTaskId, {
      fileName: pdfAsset.file_name,
      fileUrl: pdfAsset.file_url,
      fileType: 'application/pdf',
      fileSize: 1048576,
      assetId: pdfAsset.id,
      attachmentType: 'REFERENCE',
    });

    assert(pdfAttachment && pdfAttachment.id > 0, `PDF attachment created with ID: ${pdfAttachment.id}`);
    assert(pdfAttachment.type === 'document', `Attachment type identified as 'document'`);

    // ============================================================
    // TEST 9 — REASSIGNMENT
    // ============================================================
    console.log('\n--- TEST 9: Manager Reassigns Task to Ch Faisal ---');
    const reassignedTask = await taskService.reassignTask(manager, workspaceId, createdTaskId, graphicHead.id);
    assert(Number(reassignedTask.assigned_to) === Number(graphicHead.id), `MySQL assigned_to updated to Ch Faisal ID (${graphicHead.id})`);
    assert(reassignedTask.assigneeName === graphicHead.full_name, `Assignee name updated to "${graphicHead.full_name}"`);

    // Check Abu Sufyan no longer sees it in My Tasks
    const designerTasks = await taskService.getMyTasks(designer, workspaceId);
    assert(designerTasks.find((t) => t.id === createdTaskId) === undefined, `Abu Sufyan no longer sees task in My Tasks`);

    // Check Ch Faisal sees it in My Tasks
    const headTasks = await taskService.getMyTasks(graphicHead, workspaceId);
    assert(headTasks.find((t) => t.id === createdTaskId) !== undefined, `Ch Faisal now sees task in My Tasks`);

    // Check Ch Faisal received notification
    const [headNotifs] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? AND related_task_id = ? AND type = "TASK_ASSIGNED"',
      [graphicHead.id, createdTaskId]
    );
    assert(headNotifs.length >= 1, `Ch Faisal received TASK_ASSIGNED notification`);

    // ============================================================
    // TEST 10 — STATUS PROGRESSION & COMPLETION
    // ============================================================
    console.log('\n--- TEST 10: Status Workflow Progression ---');
    await taskService.updateTaskStatus(graphicHead, workspaceId, createdTaskId, 'IN_PROGRESS');
    await taskService.updateTaskStatus(graphicHead, workspaceId, createdTaskId, 'READY_FOR_REVIEW');
    const completedTask = await taskService.updateTaskStatus(manager, workspaceId, createdTaskId, 'COMPLETED');

    assert(completedTask.status === 'COMPLETED', `Task status is COMPLETED in MySQL`);
    assert(completedTask.completed_at !== null, `completed_at timestamp recorded in MySQL`);

    const [completeNotifs] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? AND related_task_id = ? AND type = "TASK_COMPLETED"',
      [graphicHead.id, createdTaskId]
    );
    assert(completeNotifs.length >= 1, `Assignee received TASK_COMPLETED notification`);

    // ============================================================
    // TEST 11 — SECURITY & WORKSPACE ISOLATION
    // ============================================================
    console.log('\n--- TEST 11: Security & IDOR Isolation ---');
    let crossWorkspaceBlocked = false;
    try {
      await taskService.getTask(99999, createdTaskId);
    } catch (e) {
      if (e.status === 404 || e.status === 403) crossWorkspaceBlocked = true;
    }
    assert(crossWorkspaceBlocked, `Cross-workspace access BLOCKED with HTTP 404/403`);

    let unauthorizedReassignBlocked = false;
    try {
      await taskService.reassignTask(designer, workspaceId, createdTaskId, designer.id);
    } catch (e) {
      if (e.status === 403) unauthorizedReassignBlocked = true;
    }
    assert(unauthorizedReassignBlocked, `Regular designer BLOCKED from reassigning tasks with HTTP 403`);

    // ============================================================
    // TEST 12 — REFRESH & DATABASE PERSISTENCE CHECK
    // ============================================================
    console.log('\n--- TEST 12: Final Persistence Verification ---');
    const reloaded = await taskService.getTask(workspaceId, createdTaskId);
    assert(reloaded.comments.length === 2, `All 2 comments persisted in MySQL`);
    assert(reloaded.attachments.length === 3, `All 3 attachments (image, video, pdf) persisted in MySQL`);
    assert(reloaded.activity.length >= 6, `Activity stream logged ${reloaded.activity.length} chronological events`);

    // Cleanup
    await db.query('DELETE FROM task_attachments WHERE task_id = ?', [createdTaskId]);
    await db.query('DELETE FROM task_comments WHERE task_id = ?', [createdTaskId]);
    await db.query('DELETE FROM task_activity WHERE task_id = ?', [createdTaskId]);
    await db.query('DELETE FROM notifications WHERE related_task_id = ?', [createdTaskId]);
    await db.query('DELETE FROM tasks WHERE id = ?', [createdTaskId]);

    for (const aId of testAssetIds) {
      await db.query('DELETE FROM assets WHERE id = ?', [aId]);
    }

    try { fs.unlinkSync(imgPath); } catch (e) {}
    try { fs.unlinkSync(vidPath); } catch (e) {}
    try { fs.unlinkSync(pdfPath); } catch (e) {}

    console.log('\nCleaned up all test artifacts from database and filesystem.');

  } catch (err) {
    console.error('CRITICAL UNEXPECTED ERROR IN TEST SUITE:', err);
    failed++;
  } finally {
    console.log('\n============================================================');
    console.log(`TEST SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log('============================================================');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runDiscussionAndAttachmentsTests();
