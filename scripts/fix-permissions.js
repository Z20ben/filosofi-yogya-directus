/**
 * Fix Permissions for Map Locations
 *
 * Ensures admin role has full access to map_locations collection
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
    throw new Error(`HTTP ${response.status}: ${error.message || JSON.stringify(error)}`);
  }

  return response.json();
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

async function fixPermissions() {
  try {
    await login();

    console.log('🔧 Checking permissions for map_locations...\n');

    // Get all roles
    const rolesResponse = await directusRequest('/roles');
    console.log('Available roles:', rolesResponse.data.map(r => `${r.name} (${r.id})`).join(', '));

    // Find admin role
    const adminRole = rolesResponse.data.find(r => r.admin_access === true || r.name.toLowerCase().includes('admin'));

    if (!adminRole) {
      console.error('❌ Admin role not found!');
      process.exit(1);
    }

    console.log(`\n✅ Found admin role: ${adminRole.name} (${adminRole.id})`);

    // Get existing permissions for map_locations
    const permissionsResponse = await directusRequest(`/permissions?filter[collection][_eq]=map_locations&filter[role][_eq]=${adminRole.id}`);

    console.log(`\n📋 Existing permissions: ${permissionsResponse.data.length} rules found`);

    // Check if we need to create permissions
    const actions = ['create', 'read', 'update', 'delete'];

    for (const action of actions) {
      const existingPerm = permissionsResponse.data.find(p => p.action === action);

      if (existingPerm) {
        console.log(`   ✅ ${action} permission already exists (id: ${existingPerm.id})`);
      } else {
        // Create permission
        try {
          await directusRequest('/permissions', {
            method: 'POST',
            body: JSON.stringify({
              role: adminRole.id,
              collection: 'map_locations',
              action: action,
              permissions: {},
              validation: {},
              presets: {},
              fields: ['*'],
            }),
          });
          console.log(`   ➕ Created ${action} permission`);
        } catch (error) {
          console.log(`   ⚠️  Could not create ${action} permission: ${error.message}`);
        }
      }
    }

    console.log('\n✅ Permissions check complete!');
    console.log('\n🔄 Next: Re-run import script');
    console.log('   node scripts/auto-import-locations.js');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixPermissions();
