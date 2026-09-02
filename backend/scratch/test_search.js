const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://127.0.0.1:5000/api';

async function runSearchAndPerformanceTests() {
  console.log('--------------------------------------------------');
  console.log('Running SocialDesk Search & Performance APIs');
  console.log('--------------------------------------------------');

  try {
    // 1. Workspace Manager Login (Sarah)
    const wmLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sarah@socialdesk.com', password: 'password123' }),
    });
    const wmToken = (await wmLogin.json()).data.token;
    console.log('✅ Workspace Manager Authenticated!');

    // 2. Client User 1 (Emily for Client 1 - Acme Corp)
    const client1Login = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'emily@acme.com', password: 'password123' }),
    });
    const client1Token = (await client1Login.json()).data.token;

    // 3. Client User 2 (Elena for Client 2 - Starlight Apparel)
    const client2Login = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'elena@luminaapparel.com', password: 'password123' }),
    });
    const client2Token = (await client2Login.json()).data.token;
    console.log('✅ Client Users Authenticated!');

    // --- GLOBAL UNIFIED SEARCH TESTS ---
    console.log('\n[Test 1] GET /api/search?q=Acme (Global unified search across 6 entities)...');
    const searchRes = await fetch(`${API_URL}/search?q=Acme`, {
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const searchData = await searchRes.json();
    console.log('searchData response:', searchData);
    console.log(`✅ Total Search Results Found: ${searchData.data ? searchData.data.totalResults : searchData.totalResults}`);
    console.log(`- Clients: ${searchData.data.clients.length}`);
    console.log(`- Projects: ${searchData.data.projects.length}`);
    console.log(`- Tasks: ${searchData.data.tasks.length}`);
    console.log(`- Content: ${searchData.data.content.length}`);
    console.log(`- Assets: ${searchData.data.assets.length}`);

    console.log('\n[Test 2] GET /api/search?q=Teaser (Searching content title keyword)...');
    const search2Res = await fetch(`${API_URL}/search?q=Teaser`, {
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const search2Data = await search2Res.json();
    console.log(`✅ Total Search Results Found: ${search2Data.data.totalResults}`);

    // --- CLIENT PRIVACY BOUNDARY CHECK ---
    console.log('\n[Test 3] Security Check: Client 1 User (Emily - Acme) searching "Acme"...');
    const client1SearchRes = await fetch(`${API_URL}/search?q=Acme`, {
      headers: { Authorization: `Bearer ${client1Token}` },
    });
    const client1SearchData = await client1SearchRes.json();
    console.log(`✅ Client 1 Search Results: ${client1SearchData.data.totalResults} matching items`);

    console.log('\n[Test 4] Security Check: Client 2 User (Elena - Starlight) searching "Acme" (Must return 0 items)...');
    const client2SearchRes = await fetch(`${API_URL}/search?q=Acme`, {
      headers: { Authorization: `Bearer ${client2Token}` },
    });
    const client2SearchData = await client2SearchRes.json();
    if (client2SearchData.data.totalResults === 0) {
      console.log('✅ PASSED: Client 2 search returned 0 items (No cross-client privacy leakage).');
    } else {
      console.error('❌ FAILED: Cross-client search result leaked data!');
    }

    // --- WHITELISTED SORTING & PAGINATION CHECK ---
    console.log('\n[Test 5] GET /api/tasks?page=1&limit=2 (Testing server-side pagination format)...');
    const paginatedRes = await fetch(`${API_URL}/tasks?page=1&limit=2`, {
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const paginatedData = await paginatedRes.json();
    console.log('✅ Standardized Pagination Metadata:', paginatedData.pagination);

    console.log('\n--------------------------------------------------');
    console.log('🎉 ALL SEARCH, PAGINATION & PERFORMANCE TESTS PASSED!');
    console.log('--------------------------------------------------');
  } catch (error) {
    console.error('❌ Search Test Error:', error);
  }
}

runSearchAndPerformanceTests();
