require('dotenv').config();
const { db } = require('../src/config/database');

async function repair() {
  console.log('--- REPAIRING LEGACY ATTACHMENTS ---');
  // 1. If any task_attachment has blob: URL, find the asset with matching file_size or create/link asset
  const [brokenAttachments] = await db.execute(
    'SELECT * FROM task_attachments WHERE file_url LIKE "blob:%" OR file_url IS NULL OR asset_id IS NULL'
  );

  console.log(`Found ${brokenAttachments.length} attachments needing resolution.`);

  for (const att of brokenAttachments) {
    // Find matching asset
    const [matchingAssets] = await db.execute(
      'SELECT id, file_url, storage_path, file_type, file_size FROM assets WHERE (file_size = ? OR file_name = ?) AND workspace_id = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT 1',
      [att.file_size, att.file_name, att.workspace_id]
    );

    if (matchingAssets.length > 0) {
      const matched = matchingAssets[0];
      const validUrl = matched.file_url || `/api/assets/${matched.id}/file`;
      await db.execute(
        'UPDATE task_attachments SET asset_id = ?, file_url = ?, file_type = COALESCE(file_type, ?) WHERE id = ?',
        [matched.id, validUrl, matched.file_type, att.id]
      );
      console.log(`✓ Repaired attachment ${att.id} (${att.file_name}) -> Asset ${matched.id} (${validUrl})`);
    } else {
      console.log(`? No exact asset found for ${att.id} (${att.file_name}).`);
    }
  }

  // 2. Also check if tasks in workspace 4 have task 35 with Zayyan.png and invoice.pdf
  const [task35Atts] = await db.execute(
    'SELECT * FROM task_attachments WHERE task_id = 35 AND deleted_at IS NULL'
  );
  console.log('Task 35 attachments after repair:', task35Atts);
  process.exit(0);
}

repair().catch(err => {
  console.error('Repair error:', err);
  process.exit(1);
});
