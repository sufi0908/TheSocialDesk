const { db } = require('../src/config/database');

async function migrateTaskTables() {
  try {
    console.log('1. Updating tasks.status ENUM...');
    await db.execute(
      `ALTER TABLE tasks MODIFY COLUMN status ENUM('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'REVIEW', 'REVISION', 'COMPLETED', 'BLOCKED') NOT NULL DEFAULT 'TODO'`
    );
    console.log('   tasks.status ENUM updated successfully.');

    console.log('2. Creating task_comments table...');
    await db.execute(
      `CREATE TABLE IF NOT EXISTS task_comments (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        task_id INT UNSIGNED NOT NULL,
        user_id INT UNSIGNED NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`
    );
    console.log('   task_comments table created successfully.');

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrateTaskTables();
