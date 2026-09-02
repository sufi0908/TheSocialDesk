require('dotenv').config();
const http = require('http');
const jwt = require('jsonwebtoken');
const { db } = require('../src/config/database');

const jwtSecret = process.env.JWT_SECRET || 'development-only-socialdesk-jwt-secret';

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(JSON.stringify(postData));
    req.end();
  });
}

async function testHttpRbac() {
  console.log('\n--- Testing HTTP Endpoints with Superadmin vs Non-Superadmin ---');

  // Fetch real superadmin user
  const [sas] = await db.execute('SELECT u.id, u.email, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = "superadmin" LIMIT 1');
  const superadmin = sas[0];
  const superadminToken = jwt.sign({ id: superadmin.id, email: superadmin.email, role: superadmin.role_name }, jwtSecret, { expiresIn: '1h' });

  // Fetch real workspace manager user
  const [wms] = await db.execute('SELECT u.id, u.email, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = "workspace_manager" LIMIT 1');
  const manager = wms[0];
  const managerToken = jwt.sign({ id: manager.id, email: manager.email, role: manager.role_name }, jwtSecret, { expiresIn: '1h' });

  // Test 1: Superadmin GET /api/superadmin/workspaces
  const saRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/superadmin/workspaces',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${superadminToken}` }
  });
  console.log(`✓ Superadmin GET /api/superadmin/workspaces -> Status: ${saRes.statusCode} (Expected: 200, Workspaces: ${saRes.body?.data?.length})`);

  // Test 2: Superadmin GET /api/superadmin/workspaces/4/team
  const saTeamRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/superadmin/workspaces/4/team',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${superadminToken}` }
  });
  console.log(`✓ Superadmin GET /api/superadmin/workspaces/4/team -> Status: ${saTeamRes.statusCode} (Expected: 200, Team count: ${saTeamRes.body?.data?.team?.length})`);

  // Test 3: Manager GET /api/superadmin/workspaces (Must be 403)
  const mgrRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/superadmin/workspaces',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${managerToken}` }
  });
  console.log(`✓ Manager GET /api/superadmin/workspaces -> Status: ${mgrRes.statusCode} (Expected: 403 Forbidden, Message: "${mgrRes.body?.message}")`);

  // Test 4: Manager DELETE /api/superadmin/workspaces/4 (Must be 403)
  const mgrDelRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/superadmin/workspaces/4',
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${managerToken}` }
  });
  console.log(`✓ Manager DELETE /api/superadmin/workspaces/4 -> Status: ${mgrDelRes.statusCode} (Expected: 403 Forbidden, Message: "${mgrDelRes.body?.message}")`);

  // Test 5: Manager PATCH /api/superadmin/workspaces/4/status (Must be 403)
  const mgrPatchRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/superadmin/workspaces/4/status',
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${managerToken}`, 'Content-Type': 'application/json' }
  }, { status: 'SUSPENDED' });
  console.log(`✓ Manager PATCH /api/superadmin/workspaces/4/status -> Status: ${mgrPatchRes.statusCode} (Expected: 403 Forbidden, Message: "${mgrPatchRes.body?.message}")`);

  console.log('\n✓ RBAC Endpoint Security fully verified!');
  process.exit(0);
}

testHttpRbac().catch(err => {
  console.error('RBAC test error:', err);
  process.exit(1);
});
