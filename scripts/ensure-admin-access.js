/**
 * Ensure Administrator Has Full Access
 *
 * Sets admin_access = true for Administrator role
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

async function ensureAdminAccess() {
  try {
    await login();

    console.log('🔧 Checking Administrator role...\n');

    // Get all roles
    const rolesResponse = await directusRequest('/roles');
    console.log('Available roles:');
    rolesResponse.data.forEach(role => {
      console.log(`   - ${role.name} (${role.id})`);
      console.log(`     admin_access: ${role.admin_access}`);
      console.log(`     app_access: ${role.app_access}`);
    });

    // Find administrator role
    const adminRole = rolesResponse.data.find(r =>
      r.name.toLowerCase().includes('admin') || r.id === 'a9005e30-4f11-40a2-994d-09b923c023a7'
    );

    if (!adminRole) {
      console.error('\n❌ Administrator role not found!');
      process.exit(1);
    }

    console.log(`\n✅ Found role: ${adminRole.name} (${adminRole.id})`);

    // Check if admin_access is already true
    if (adminRole.admin_access === true) {
      console.log('✅ Admin access already enabled!');
      console.log('\n💡 Permissions should work now. Try the import again.');
    } else {
      console.log('⚠️  Admin access is NOT enabled. Enabling now...');

      // Update role to enable admin_access
      await directusRequest(`/roles/${adminRole.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          admin_access: true,
          app_access: true,
        }),
      });

      console.log('✅ Admin access enabled!');
      console.log('\n🔄 Please restart Directus server for changes to take effect.');
    }

    console.log('\n📋 Next Steps:');
    console.log('   1. Restart Directus server');
    console.log('   2. Hard refresh browser (Ctrl+Shift+R)');
    console.log('   3. Try import again (UI or script)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Alternative: Check permissions manually in Directus UI');
    console.log('   Settings → Roles & Permissions → Administrator');
    console.log('   Enable "Admin Access" toggle');
    process.exit(1);
  }
}

ensureAdminAccess();
