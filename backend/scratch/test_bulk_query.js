const { db } = require('../src/config/database');

(async () => {
  try {
    const [contentRows] = await db.query('SELECT id FROM content WHERE deleted_at IS NULL LIMIT 20');
    const ids = contentRows.map(r => r.id);
    console.log('Sample IDs:', ids);
    if (ids.length === 0) return;

    const inPlaceholders = ids.map(() => '?').join(',');
    const [platformRows] = await db.query(
      `SELECT content_id, platform FROM content_platforms WHERE content_id IN (${inPlaceholders})`,
      ids
    );
    console.log('Platforms found:', platformRows.length);

    const [assetRows] = await db.query(
      `SELECT ca.content_id, a.id, a.file_name, a.original_filename, a.file_url, a.file_type, a.file_size, a.mime_type, a.created_at
       FROM content_assets ca
       JOIN assets a ON ca.asset_id = a.id
       WHERE ca.content_id IN (${inPlaceholders}) AND a.deleted_at IS NULL
       UNION ALL
       SELECT a.content_id, a.id, a.file_name, a.original_filename, a.file_url, a.file_type, a.file_size, a.mime_type, a.created_at
       FROM assets a
       WHERE a.content_id IN (${inPlaceholders}) AND a.deleted_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM content_assets ca2 WHERE ca2.content_id = a.content_id)
       ORDER BY created_at DESC`,
      [...ids, ...ids]
    );
    console.log('Assets found:', assetRows.length);
    console.log('Sample asset:', assetRows[0]);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
