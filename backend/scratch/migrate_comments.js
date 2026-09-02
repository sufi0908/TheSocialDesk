const { db } = require('../src/config/database');

async function migrate() {
  const [cols] = await db.query('DESCRIBE task_comments');
  console.log('Columns in task_comments:', cols.map((c) => c.Field));

  const hasDeletedAt = cols.some((c) => c.Field === 'deleted_at');
  if (!hasDeletedAt) {
    console.log('Adding deleted_at column to task_comments...');
    await db.query('ALTER TABLE task_comments ADD COLUMN deleted_at DATETIME NULL AFTER created_at');
    console.log('Added deleted_at to task_comments.');
  }

  const hasUpdatedAt = cols.some((c) => c.Field === 'updated_at');
  if (!hasUpdatedAt) {
    console.log('Adding updated_at column to task_comments...');
    await db.query('ALTER TABLE task_comments ADD COLUMN updated_at DATETIME NULL AFTER created_at');
    console.log('Added updated_at to task_comments.');
  }

  process.exit(0);
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
