/**
 * Debug Permissions Issue
 *
 * Check current user, role, and permissions
 */

import 'dotenv/config';

const DIRECTUS_URL = process.env.PUBLIC_URL || 'http://localhost:8055';
let accessToken = null;

async function directusRequest(endpoint, options = {}) {
  const url = `${DIRECTUS_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    return { error: true, status: response.status, message: error };
  }

  return await response.json();
}

async function login() {
  console.log('🔐 Authenticating...');

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
  accessToken = data.data.access_token;
  console.log('✅ Authenticated successfully\n');
}

async function debugPermissions() {
  try {
    await login();

    console.log('📊 Debugging Permissions...\n');
    console.log('─'.repeat(60));

    // Check current user
    console.log('\n1️⃣  Current User Info:');
    const meResult = await directusRequest('/users/me?fields=*,role.*');
    if (meResult.error) {
      console.log('   ❌ Error:', meResult.message);
    } else {
      console.log('   Email:', meResult.data.email);
      console.log('   ID:', meResult.data.id);
      console.log('   Role:', meResult.data.role?.name);
      console.log('   Role ID:', meResult.data.role?.id);
      console.log('   Admin Access:', meResult.data.role?.admin_access);
      console.log('   App Access:', meResult.data.role?.app_access);
    }

    // Check all roles
    console.log('\n2️⃣  All Roles:');
    const rolesResult = await directusRequest('/roles');
    if (rolesResult.error) {
      console.log('   ❌ Error:', rolesResult.message);
    } else {
      rolesResult.data.forEach(role => {
        console.log(`\n   Role: ${role.name}`);
        console.log(`   - ID: ${role.id}`);
        console.log(`   - admin_access: ${role.admin_access}`);
        console.log(`   - app_access: ${role.app_access}`);
      });
    }

    // Check permissions for map_locations
    console.log('\n3️⃣  Map Locations Permissions:');
    const permsResult = await directusRequest('/permissions?filter[collection][_eq]=map_locations');
    if (permsResult.error) {
      console.log('   ❌ Error:', permsResult.message);
    } else {
      if (permsResult.data.length === 0) {
        console.log('   ⚠️  No explicit permissions found for map_locations');
        console.log('   💡 This might be the issue!');
      } else {
        permsResult.data.forEach(perm => {
          console.log(`\n   Permission ID: ${perm.id}`);
          console.log(`   - Role: ${perm.role}`);
          console.log(`   - Action: ${perm.action}`);
          console.log(`   - Fields: ${perm.fields}`);
        });
      }
    }

    // Try to read map_locations
    console.log('\n4️⃣  Test Read Map Locations:');
    const locationsResult = await directusRequest('/items/map_locations?limit=1');
    if (locationsResult.error) {
      console.log('   ❌ Error:', locationsResult.message);
    } else {
      console.log(`   ✅ Can read! Found ${locationsResult.data.length} items`);
    }

    // Try to create a test location
    console.log('\n5️⃣  Test Create Map Location:');
    const createResult = await directusRequest('/items/map_locations', {
      method: 'POST',
      body: JSON.stringify({
        id: 'test-location-' + Date.now(),
        name_id: 'Test Location',
        name_en: 'Test Location',
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
    if (createResult.error) {
      console.log('   ❌ Error:', createResult.message);
      console.log('\n   🔍 This is why import is failing!');
    } else {
      console.log('   ✅ Create works! Test location created.');

      // Delete test location
      await directusRequest(`/items/map_locations/${createResult.data.id}`, {
        method: 'DELETE',
      });
      console.log('   🗑️  Test location deleted.');
    }

    console.log('\n' + '─'.repeat(60));
    console.log('\n📋 Diagnosis Complete!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

debugPermissions();
