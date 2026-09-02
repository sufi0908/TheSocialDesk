const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { db } = require('../src/config/database');

async function inspectUsersAndTeams() {
  const [users] = await db.query(`
    SELECT u.id, u.full_name, u.email, r.name as role_name, r.display_name, tm.department, tm.role_title
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    LEFT JOIN team_members tm ON u.id = tm.user_id
    WHERE u.deleted_at IS NULL
    LIMIT 20
  `);
  console.log('Sample Users & Roles/Departments:');
  console.table(users);

  const [existingTasks] = await db.query(`
    SELECT t.id, t.title, t.status, t.priority, t.assigned_to, u.full_name as assignee, r.name as role
    FROM tasks t
    LEFT JOIN users u ON t.assigned_to = u.id
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE t.deleted_at IS NULL
    LIMIT 10
  `);
  console.log('Sample Existing Tasks:');
  console.table(existingTasks);

  process.exit(0);
}

inspectUsersAndTeams();
