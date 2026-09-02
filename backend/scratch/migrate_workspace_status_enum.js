require('dotenv').config();
const { db } = require('../src/config/database');

async function migrate() {
  try {
    await db.execute("ALTER TABLE workspaces MODIFY COLUMN status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE'");
    console.log('Successfully updated workspaces status ENUM.');
    const [cols] = await db.execute("SHOW COLUMNS FROM workspaces LIKE 'status'");
    console.log('Updated column:', cols[0]);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
