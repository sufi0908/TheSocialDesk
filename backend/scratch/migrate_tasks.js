const { db } = require('../src/config/database');

async function migrate() {
  try {
    const [cols] = await db.query('DESCRIBE tasks');
    const colNames = cols.map(c => c.Field);
    if (!colNames.includes('instructions')) {
      await db.query('ALTER TABLE tasks ADD COLUMN instructions TEXT NULL AFTER description');
      console.log('Added instructions column to tasks');
    }
    if (!colNames.includes('due_time')) {
      await db.query('ALTER TABLE tasks ADD COLUMN due_time VARCHAR(20) NULL AFTER due_date');
      console.log('Added due_time column to tasks');
    }
    if (!colNames.includes('completed_at')) {
      await db.query('ALTER TABLE tasks ADD COLUMN completed_at DATETIME NULL AFTER updated_at');
      console.log('Added completed_at column to tasks');
    }

    await db.query(`
      ALTER TABLE tasks MODIFY COLUMN status
      ENUM('TODO','IN_PROGRESS','READY_FOR_REVIEW','IN_REVIEW','REVIEW','REVISION','COMPLETED','BLOCKED','REOPENED')
      NOT NULL DEFAULT 'TODO'
    `);
    console.log('Updated status enum on tasks');

    // Create task_attachments
    await db.query(`
      CREATE TABLE IF NOT EXISTS task_attachments (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        workspace_id INT UNSIGNED NOT NULL,
        task_id INT UNSIGNED NOT NULL,
        asset_id INT UNSIGNED NULL,
        user_id INT UNSIGNED NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        file_type VARCHAR(100) NULL,
        file_size INT UNSIGNED NULL,
        attachment_type ENUM('REFERENCE', 'SUBMISSION') DEFAULT 'REFERENCE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        INDEX idx_task_id (task_id),
        INDEX idx_workspace_id (workspace_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('task_attachments table ready');

    // Create task_activity
    await db.query(`
      CREATE TABLE IF NOT EXISTS task_activity (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        workspace_id INT UNSIGNED NOT NULL,
        task_id INT UNSIGNED NOT NULL,
        user_id INT UNSIGNED NOT NULL,
        action VARCHAR(100) NOT NULL,
        description TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_task_act (task_id),
        INDEX idx_ws_act (workspace_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('task_activity table ready');

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
