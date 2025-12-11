/**
 * Test String ID via API
 *
 * After changing id to VARCHAR, test if we can create with string IDs
 */

import 'dotenv/config';

const DIRECTUS_URL = process.env.PUBLIC_URL || 'http://localhost:8055';

async function testStringIdApi() {
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

    // Test 1: Create with string ID
    console.log('🧪 Test 1: Creating with string ID "test-string-location"...');

    const testData = {
      id: 'test-string-location',
      name_id: 'Test String Location',
      name_en: 'Test String Location',
      description_id: 'Testing string ID functionality',
      description_en: 'Testing string ID functionality',
      category: 'heritage',
      latitude: -7.8,
      longitude: 110.3,
      address_id: 'Test Address',
      address_en: 'Test Address',
      status: 'draft',
    };

    const createResponse = await fetch(`${DIRECTUS_URL}/items/map_locations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    console.log('   Status:', createResponse.status);

    if (createResponse.ok) {
      const result = await createResponse.json();
      console.log('   ✅ SUCCESS! Created with string ID:', result.data.id);

      // Delete test
      await fetch(`${DIRECTUS_URL}/items/map_locations/test-string-location`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      console.log('   🗑️  Test item deleted');

      console.log('\n🎉 STRING IDs WORK via API!');
      console.log('\n✅ Ready to import all 29 locations!');
      console.log('   Run: node scripts/auto-import-locations.js');

    } else {
      const errorData = await createResponse.json();
      console.log('   ❌ Still fails:');
      console.log(JSON.stringify(errorData, null, 2));
      console.log('\n💡 Possible issues:');
      console.log('   - Directus not restarted yet');
      console.log('   - Schema cache not cleared');
      console.log('   - Need to manually refresh collection in Directus UI');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testStringIdApi();
