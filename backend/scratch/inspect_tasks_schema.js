const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { db } = require('../src/config/database');

async function inspect() {
  const [cols] = await db.query("SHOW COLUMNS FROM tasks LIKE 'status'");
  console.log('tasks.status:', cols[0]);
  const [allCols] = await db.query('SHOW COLUMNS FROM tasks');
  console.log('All tasks columns:', allCols.map(c => `${c.Field} (${c.Type})`));
  process.exit(0);
}

inspect();
