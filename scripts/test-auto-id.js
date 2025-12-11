/**
 * Test Create Without ID (Let Auto-Increment)
 */

import 'dotenv/config';

const DIRECTUS_URL = process.env.PUBLIC_URL || 'http://localhost:8055';

async function testAutoId() {
  try {
    // Login
    console.log('🔐 Logging in...');
    const loginResponse = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      }),
    });

    const loginData = await loginResponse.json();
    const token = loginData.data.access_token;
    console.log('✅ Logged in\n');

    console.log('🧪 Test 1: Create WITHOUT id field (auto-increment)...');
    const test1Response = await fetch(`${DIRECTUS_URL}/items/map_locations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name_id: 'Test Auto ID',
        name_en: 'Test Auto ID',
        description_id: 'Test',
        description_en: 'Test',
        category: 'heritage',
        latitude: -7.8,
        longitude: 110.3,
        address_id: 'Test',
        address_en: 'Test',
        status: 'draft',
      }),
    });

    console.log('   Status:', test1Response.status);

    if (test1Response.ok) {
      const result = await test1Response.json();
      console.log('   ✅ SUCCESS! Created with auto-ID:', result.data.id);

      // Delete it
      await fetch(`${DIRECTUS_URL}/items/map_locations/${result.data.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      console.log('   🗑️  Deleted test item');

      console.log('\n🎉 PROBLEM FOUND: Cannot use custom string IDs via API!');
      console.log('   Database uses auto-increment INTEGER ids');
      console.log('   Our data has string ids like "keraton-yogyakarta"');
      console.log('\n💡 SOLUTIONS:');
      console.log('   1. Use auto-increment IDs, store string id in different field');
      console.log('   2. Change database column id to VARCHAR to allow string ids');
      console.log('   3. Import via SQL directly (bypasses API validation)');

    } else {
      const errorData = await test1Response.json();
      console.log('   ❌ Still fails:', errorData);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testAutoId();
