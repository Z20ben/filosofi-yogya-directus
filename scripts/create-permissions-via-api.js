/**
 * Create Permissions via Directus API
 *
 * Instead of direct DB, use API to create permissions
 * This ensures Directus creates them in the correct format
 */

import 'dotenv/config';

const DIRECTUS_URL = process.env.PUBLIC_URL || 'http://localhost:8055';

async function createPermissionsViaAPI() {
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

    const adminPolicyId = '589ed02d-416c-405b-9f75-b4b99285e584';

    // First, delete existing permissions
    console.log('🗑️  Deleting existing permissions...');
    const existingPerms = await fetch(
      `${DIRECTUS_URL}/permissions?filter[collection][_eq]=map_locations&filter[policy][_eq]=${adminPolicyId}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const existingPermsData = await existingPerms.json();

    for (const perm of existingPermsData.data) {
      await fetch(`${DIRECTUS_URL}/permissions/${perm.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      console.log(`   Deleted permission ID ${perm.id} (${perm.action})`);
    }

    console.log('\n➕ Creating permissions via API...\n');

    const actions = ['create', 'read', 'update', 'delete'];

    for (const action of actions) {
      const permissionData = {
        collection: 'map_locations',
        action: action,
        policy: adminPolicyId,
        fields: ['*'],
        // Don't include permissions, validation, presets - let Directus set defaults
      };

      const createResponse = await fetch(`${DIRECTUS_URL}/permissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(permissionData),
      });

      if (createResponse.ok) {
        const createData = await createResponse.json();
        console.log(`   ✅ ${action} - created (ID: ${createData.data.id})`);
      } else {
        const errorData = await createResponse.json();
        console.log(`   ❌ ${action} - failed:`, errorData);
      }
    }

    // Test CREATE
    console.log('\n🧪 Testing CREATE operation...');
    const testId = 'test-api-' + Date.now();
    const testResponse = await fetch(`${DIRECTUS_URL}/items/map_locations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: testId,
        name_id: 'Test',
        name_en: 'Test',
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

    if (testResponse.ok) {
      console.log('   ✅ CREATE WORKS!!!');
      const testData = await testResponse.json();

      // Delete test
      await fetch(`${DIRECTUS_URL}/items/map_locations/${testId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      console.log('   🗑️  Test item deleted');
      console.log('\n🎉 SUCCESS! Ready to import data!');
      console.log('   Run: node scripts/auto-import-locations.js');
    } else {
      const errorData = await testResponse.json();
      console.log('   ❌ CREATE still fails:', errorData);
      console.log('\n💡 This might be a Directus bug or requires manual UI setup');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createPermissionsViaAPI();
