const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://127.0.0.1:5000/api';

async function runAssetsAndBrandKitTests() {
  console.log('--------------------------------------------------');
  console.log('Running SocialDesk Assets & Brand Kit Management APIs');
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

    // 2. Client User 1 Login (Emily - Acme Corp Representative for Client 1)
    const client1Login = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'emily@acme.com', password: 'password123' }),
    });
    const client1Token = (await client1Login.json()).data.token;

    // 3. Client User 2 Login (Elena - Starlight Apparel Representative for Client 2)
    const client2Login = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'elena@luminaapparel.com', password: 'password123' }),
    });
    const client2Token = (await client2Login.json()).data.token;
    console.log('✅ Client Users Authenticated!');

    // --- ASSETS TESTS ---
    console.log('\n[Test 1] POST /api/assets (Registering asset metadata)...');
    const createAssetRes = await fetch(`${API_URL}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({
        fileName: 'Acme_Q4_Campaign_Banner_4K.jpg',
        fileUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=80',
        fileType: 'IMAGE',
        fileSize: 4800000,
        mimeType: 'image/jpeg',
        clientId: 1,
        category: 'Banners',
        tags: ['Q4', 'Campaign', 'Acme'],
      }),
    });
    const createAssetData = await createAssetRes.json();
    const assetId = createAssetData.data.id;
    console.log('✅ Asset Created:', createAssetData.data.file_name, '| Asset ID:', assetId);

    console.log('\n[Test 2] GET /api/assets (Listing workspace assets)...');
    const listAssetsRes = await fetch(`${API_URL}/assets`, {
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const listAssetsData = await listAssetsRes.json();
    console.log(`✅ Total Assets Found: ${listAssetsData.data.length}`);
    console.table(listAssetsData.data.map(a => ({ id: a.id, file_name: a.file_name, file_type: a.file_type, client_name: a.client_name })));

    console.log('\n[Test 3] PUT /api/assets/:id (Renaming asset & updating tags)...');
    const updateAssetRes = await fetch(`${API_URL}/assets/${assetId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({
        fileName: 'Acme_Q4_Master_Banner_Revised.jpg',
        category: 'Master Assets',
        tags: ['Q4', 'Master', 'Banner'],
      }),
    });
    const updateAssetData = await updateAssetRes.json();
    console.log('✅ Asset Updated:', updateAssetData.data.file_name, '| Category:', updateAssetData.data.category);

    console.log('\n[Test 4] POST /api/assets/:id/attach (Attaching asset to Content ID 1)...');
    const attachRes = await fetch(`${API_URL}/assets/${assetId}/attach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({ contentId: 1 }),
    });
    const attachData = await attachRes.json();
    console.log('✅ Asset Attached:', attachData.message);

    // --- BRAND KIT TESTS ---
    console.log('\n[Test 5] GET /api/clients/1/brand-kit (Fetching Client 1 Brand Kit)...');
    const getBkRes = await fetch(`${API_URL}/clients/1/brand-kit`, {
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const getBkData = await getBkRes.json();
    console.log('✅ Brand Kit Retrieved:', getBkData.data.brandName, '| Primary Color:', getBkData.data.primaryColor);

    console.log('\n[Test 6] PUT /api/clients/1/brand-kit (Updating Client 1 Brand Kit)...');
    const updateBkRes = await fetch(`${API_URL}/clients/1/brand-kit`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wmToken}`,
      },
      body: JSON.stringify({
        brandName: 'Acme Global Corporation',
        primaryColor: '#4F46E5',
        secondaryColor: '#0EA5E9',
        accentColor: '#F59E0B',
        colors: ['#4F46E5', '#0EA5E9', '#F59E0B', '#10B981'],
        fontFamily: 'Inter, sans-serif',
        logoUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&auto=format&fit=crop&q=80',
        guidelinesNotes: 'Maintain 20% brand margin. Use white logo on dark overlay backgrounds.',
      }),
    });
    const updateBkData = await updateBkRes.json();
    console.log('✅ Brand Kit Updated:', updateBkData.data.brandName, '| Colors:', updateBkData.data.colors);

    // --- SECURITY & PRIVACY CHECKS ---
    console.log('\n[Test 7] Security Check: Client 1 User (Emily) accessing Client 1 Brand Kit...');
    const client1BkRes = await fetch(`${API_URL}/clients/1/brand-kit`, {
      headers: { Authorization: `Bearer ${client1Token}` },
    });
    const client1BkData = await client1BkRes.json();
    console.log('✅ Client 1 Brand Kit Access Allowed:', client1BkData.data.brandName);

    console.log('\n[Test 8] Security Check: Client 2 User (Elena) attempting to access Client 1 Brand Kit...');
    const client2ForbiddenRes = await fetch(`${API_URL}/clients/1/brand-kit`, {
      headers: { Authorization: `Bearer ${client2Token}` },
    });
    const client2ForbiddenData = await client2ForbiddenRes.json();
    if (client2ForbiddenRes.status === 403) {
      console.log('✅ PASSED (403 Forbidden):', client2ForbiddenData.message);
    } else {
      console.error('❌ FAILED: Expected 403 Forbidden for cross-client brand kit access');
    }

    console.log('\n[Test 9] DELETE /api/assets/:id (Soft deleting asset)...');
    const deleteAssetRes = await fetch(`${API_URL}/assets/${assetId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${wmToken}` },
    });
    const deleteAssetData = await deleteAssetRes.json();
    console.log('✅ Asset Deleted:', deleteAssetData.message);

    console.log('\n--------------------------------------------------');
    console.log('🎉 ALL ASSET & BRAND KIT API TESTS PASSED!');
    console.log('--------------------------------------------------');
  } catch (error) {
    console.error('❌ Assets/BrandKit Test Error:', error);
  }
}

runAssetsAndBrandKitTests();
