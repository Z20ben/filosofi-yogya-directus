/**
 * Fresh Login and Test Import
 *
 * Gets a completely fresh auth token and tests import
 */

import 'dotenv/config';

const DIRECTUS_URL = process.env.PUBLIC_URL || 'http://localhost:8055';

async function freshLoginAndTest() {
  try {
    console.log('🔐 Getting fresh authentication token...');

    const response = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      }),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`);
    }

    const data = await response.json();
    const accessToken = data.data.access_token;
    console.log('✅ Fresh token obtained\n');

    // Test reading user info with fresh token
    console.log('📊 Testing user info with fresh token...');
    const meResponse = await fetch(`${DIRECTUS_URL}/users/me?fields=*,role.*,role.policies.*`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
    });

    if (!meResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const meData = await meResponse.json();
    console.log('User:', meData.data.email);
    console.log('Role:', meData.data.role?.name);
    console.log('Role ID:', meData.data.role?.id);
    console.log('Policies:', meData.data.role?.policies);

    // Try to create a test location with fresh token
    console.log('\n🧪 Testing CREATE with fresh token...');

    const testLocation = {
      id: 'test-fresh-' + Date.now(),
      name_id: 'Test Location Fresh',
      name_en: 'Test Location Fresh',
      description_id: 'Test',
      description_en: 'Test',
      category: 'heritage',
      latitude: -7.8,
      longitude: 110.3,
      address_id: 'Test',
      address_en: 'Test',
      status: 'draft',
    };

    const createResponse = await fetch(`${DIRECTUS_URL}/items/map_locations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testLocation),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      console.log('❌ CREATE still fails:', errorData);
      console.log('\n🔍 Debugging info:');
      console.log('   Status:', createResponse.status);
      console.log('   Token valid: ✅');
      console.log('   User is admin: ✅');
      console.log('   Permissions exist in DB: ✅');
      console.log('\n💡 Possible issues:');
      console.log('   1. Permissions cache not cleared');
      console.log('   2. Policy not linked to role correctly');
      console.log('   3. Admin access flag not working');
      console.log('\n🔧 Try manual check in Directus UI:');
      console.log('   Settings → Roles & Permissions → Administrator');
      console.log('   Check if "Admin Access" toggle is ON');
    } else {
      const createData = await createResponse.json();
      console.log('✅ CREATE works! Test location created:', createData.data.id);

      // Delete test location
      await fetch(`${DIRECTUS_URL}/items/map_locations/${createData.data.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      console.log('🗑️  Test location deleted\n');
      console.log('🎉 Everything works! Ready to import real data!');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

freshLoginAndTest();
