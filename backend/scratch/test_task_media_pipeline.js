require('dotenv').config();
const { db } = require('../src/config/database');
const taskService = require('../src/services/taskService');

async function runMediaPipelineTests() {
  console.log('============================================================');
  console.log('STARTING TASK MEDIA & REFERENCE FILE VISIBILITY TEST SUITE');
  console.log('============================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    const wsId = 4;
    const manager = { id: 14, role: 'workspace_manager', full_name: 'Farhan Manager' };
    const designer = { id: 18, role: 'graphic_designer', full_name: 'Abu Sufyan Designer' };
    const unauthorizedUser = { id: 16, role: 'video_editor', full_name: 'Ch Faisal' };

    // ------------------------------------------------------------
    // TEST 1 — IMAGE PREVIEW END-TO-END
    // ------------------------------------------------------------
    console.log('\n--- TEST 1: IMAGE PREVIEW PIPELINE (Zayyan.png) ---');
    const task35 = await taskService.getTask(designer, wsId, 35);
    const zayyanImg = task35.referenceFiles.find((f) => f.fileName.includes('Zayyan.png'));

    assert(Boolean(zayyanImg), 'Zayyan.png found in task reference files');
    assert(zayyanImg.type === 'image', 'Zayyan.png type correctly identified as "image"');
    assert(zayyanImg.mimeType === 'image/png', 'Zayyan.png mimeType is "image/png"');
    assert(zayyanImg.url && zayyanImg.url.startsWith('/api/assets/'), `Zayyan.png has accessible asset URL: ${zayyanImg.url}`);
    assert(zayyanImg.fileSize === '38 KB', `Zayyan.png formatted size is accurate: ${zayyanImg.fileSize}`);

    // Verify HTTP serving of image
    const imgRes = await fetch(`http://localhost:5000${zayyanImg.url}`);
    assert(imgRes.status === 200, `Image URL is live and returns HTTP 200 (Got: ${imgRes.status})`);
    assert(imgRes.headers.get('content-type')?.includes('image/png'), `Image Content-Type header is image/png (Got: ${imgRes.headers.get('content-type')})`);

    // ------------------------------------------------------------
    // TEST 2 — PDF PREVIEW & DOWNLOAD PIPELINE (invoice.pdf)
    // ------------------------------------------------------------
    console.log('\n--- TEST 2: PDF PREVIEW & DOWNLOAD PIPELINE (invoice.pdf) ---');
    const invoicePdf = task35.referenceFiles.find((f) => f.fileName.includes('invoice.pdf'));

    assert(Boolean(invoicePdf), 'invoice.pdf found in task reference files');
    assert(invoicePdf.type === 'pdf', 'invoice.pdf type correctly identified as "pdf"');
    assert(invoicePdf.mimeType === 'application/pdf', 'invoice.pdf mimeType is "application/pdf"');
    assert(invoicePdf.url && invoicePdf.url.startsWith('/api/assets/'), `invoice.pdf has accessible asset URL: ${invoicePdf.url}`);
    assert(invoicePdf.fileSize === '269 KB', `invoice.pdf formatted size is accurate: ${invoicePdf.fileSize}`);

    // Verify HTTP serving of PDF
    const pdfRes = await fetch(`http://localhost:5000${invoicePdf.url}`);
    assert(pdfRes.status === 200, `PDF URL is live and returns HTTP 200 (Got: ${pdfRes.status})`);
    assert(pdfRes.headers.get('content-type')?.includes('application/pdf'), `PDF Content-Type header is application/pdf (Got: ${pdfRes.headers.get('content-type')})`);

    // ------------------------------------------------------------
    // TEST 3 — VIDEO PLAYBACK WITH HTTP RANGE (MP4)
    // ------------------------------------------------------------
    console.log('\n--- TEST 3: VIDEO PLAYBACK WITH HTTP RANGE ---');
    // Attach video asset 45 to a new test task
    const videoTask = await taskService.createTask(manager, wsId, {
      title: 'Video Pipeline Verification Task',
      description: 'Review summer reel MP4 video',
      assignedTo: designer.id,
      priority: 'HIGH',
    });

    const videoAttachment = await taskService.addAttachment(manager, wsId, videoTask.id, {
      assetId: 45,
      fileName: 'summer-reel-promo.mp4',
      fileUrl: '/api/assets/45/file',
      fileType: 'video/mp4',
      fileSize: 752100,
      attachmentType: 'REFERENCE',
    });

    assert(videoAttachment.type === 'video', 'MP4 attachment type correctly identified as "video"');
    assert(videoAttachment.mimeType === 'video/mp4', 'MP4 mimeType is "video/mp4"');

    // Test HTTP Range byte streaming on video
    const videoRangeRes = await fetch('http://localhost:5000/api/assets/45/file', {
      headers: { Range: 'bytes=0-1023' },
    });
    assert(videoRangeRes.status === 206, `Video endpoint supports HTTP 206 Partial Content for instant seeking (Got: ${videoRangeRes.status})`);
    assert(videoRangeRes.headers.get('content-range')?.includes('bytes 0-1023/'), `Video returns Content-Range header: ${videoRangeRes.headers.get('content-range')}`);

    // ------------------------------------------------------------
    // TEST 4 — MULTIPLE MIXED FILES IN SAME TASK
    // ------------------------------------------------------------
    console.log('\n--- TEST 4: MULTIPLE FILES (IMAGE + PDF + VIDEO) IN SAME TASK ---');
    // Add image and PDF to videoTask
    await taskService.addAttachment(manager, wsId, videoTask.id, {
      assetId: 37,
      fileName: 'banner-hero.png',
      fileUrl: '/api/assets/37/file',
      fileType: 'image/png',
      fileSize: 39407,
      attachmentType: 'REFERENCE',
    });

    await taskService.addAttachment(manager, wsId, videoTask.id, {
      assetId: 46,
      fileName: 'contract-brief.pdf',
      fileUrl: '/api/assets/46/file',
      fileType: 'application/pdf',
      fileSize: 275483,
      attachmentType: 'REFERENCE',
    });

    const fetchedMultiTask = await taskService.getTask(designer, wsId, videoTask.id);
    assert(fetchedMultiTask.referenceFiles.length === 3, `All 3 files present in referenceFiles (Got: ${fetchedMultiTask.referenceFiles.length})`);
    const typesPresent = fetchedMultiTask.referenceFiles.map((f) => f.type);
    assert(typesPresent.includes('image'), 'Contains image type');
    assert(typesPresent.includes('pdf'), 'Contains pdf type');
    assert(typesPresent.includes('video'), 'Contains video type');

    // ------------------------------------------------------------
    // TEST 5 — PERSISTENCE & DATABASE INTEGRITY
    // ------------------------------------------------------------
    console.log('\n--- TEST 5: PERSISTENCE ACROSS RE-FETCH ---');
    const [dbRows] = await db.execute(
      'SELECT id, file_name, file_url, asset_id, attachment_type FROM task_attachments WHERE task_id = ? AND deleted_at IS NULL',
      [videoTask.id]
    );
    assert(dbRows.length === 3, 'All 3 attachment rows persisted in MySQL task_attachments');
    assert(dbRows.every((r) => !r.file_url.startsWith('blob:')), 'Zero ephemeral blob: URLs in MySQL');

    // ------------------------------------------------------------
    // TEST 6 & 7 — SECURITY & PERMISSIONS
    // ------------------------------------------------------------
    console.log('\n--- TEST 6 & 7: SECURITY & UNAUTHORIZED USER BLOCKING ---');
    // Unauthorized team member attempting to access videoTask (assigned to designer 18)
    try {
      await taskService.getTask(unauthorizedUser, wsId, videoTask.id);
      assert(false, 'Unauthorized user was able to access task!');
    } catch (err) {
      assert(err.status === 403, 'Unauthorized user blocked with 403 Forbidden');
    }

    // ------------------------------------------------------------
    // TEST 8 — STATUS WORKFLOW & DELIVERABLE SUBMISSION
    // ------------------------------------------------------------
    console.log('\n--- TEST 8: STATUS WORKFLOW & DELIVERABLE SUBMISSION ---');
    // Designer starts task
    await taskService.updateTaskStatus(designer, wsId, videoTask.id, 'IN_PROGRESS');
    // Designer uploads deliverable
    await taskService.addAttachment(designer, wsId, videoTask.id, {
      assetId: 37,
      fileName: 'final-delivered-artwork.png',
      fileUrl: '/api/assets/37/file',
      fileType: 'image/png',
      fileSize: 39407,
      attachmentType: 'SUBMISSION',
    });
    // Designer submits for review
    await taskService.updateTaskStatus(designer, wsId, videoTask.id, 'READY_FOR_REVIEW');

    const submittedTask = await taskService.getTask(manager, wsId, videoTask.id);
    assert(submittedTask.status === 'READY_FOR_REVIEW', 'Task status is READY_FOR_REVIEW');
    assert(submittedTask.deliverables.length === 1, 'Deliverable successfully isolated in deliverables array');
    assert(submittedTask.deliverables[0].attachmentType === 'SUBMISSION', 'Deliverable marked as SUBMISSION');

    // Manager approves
    await taskService.updateTaskStatus(manager, wsId, videoTask.id, 'COMPLETED');
    const completedTask = await taskService.getTask(manager, wsId, videoTask.id);
    assert(completedTask.status === 'COMPLETED', 'Task status is COMPLETED');

    console.log('\n============================================================');
    console.log(`TASK MEDIA PIPELINE TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('============================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal error during test run:', error);
    process.exit(1);
  }
}

runMediaPipelineTests();
