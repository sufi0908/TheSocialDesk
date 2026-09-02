const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
const mysql = require('mysql2/promise');

async function testDatabaseSchema() {
  console.log('Testing MySQL Connection & Schema execution...');
  console.log(`DB Host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`DB User: ${process.env.DB_USER || 'root'}`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true,
    });

    console.log('Successfully connected to MySQL Server!');

    const schemaSql = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
    console.log('Executing database/schema.sql...');
    await connection.query(schemaSql);
    console.log('✅ schema.sql executed successfully!');

    const seedSql = fs.readFileSync(path.join(__dirname, '../database/seed.sql'), 'utf8');
    console.log('Executing database/seed.sql...');
    await connection.query(seedSql);
    console.log('✅ seed.sql executed successfully!');

    const [tables] = await connection.query('SHOW TABLES FROM socialdesk');
    console.log(`✅ Total tables in socialdesk database: ${tables.length}`);
    console.table(tables.map(t => Object.values(t)[0]));

    await connection.end();
  } catch (error) {
    console.error('MySQL Test execution output:');
    console.error(`Code: ${error.code}`);
    console.error(`Message: ${error.message}`);
    if (connection) await connection.end();
  }
}

testDatabaseSchema();
