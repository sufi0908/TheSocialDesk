const { db } = require('../src/config/database');

async function inspectChatTables() {
  const [tables] = await db.query("SHOW TABLES LIKE 'chat%'");
  console.log('Chat tables:', tables);

  for (const t of tables) {
    const tableName = Object.values(t)[0];
    const [cols] = await db.query(`DESCRIBE \`${tableName}\``);
    console.log(`\n=== Table: ${tableName} ===`);
    console.log(cols.map((c) => `${c.Field} (${c.Type}) - Key: ${c.Key} - Null: ${c.Null} - Default: ${c.Default}`).join('\n'));
  }

  process.exit(0);
}

inspectChatTables().catch((err) => {
  console.error(err);
  process.exit(1);
});
