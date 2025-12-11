/**
 * Force Enable Admin Access on Administrator Policy
 */

import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function forceAdminAccess() {
  const client = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_DATABASE || 'filosofi_yogya_directus',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'qwerty123',
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\n');

    // Check current state
    console.log('📊 Current Administrator policy:');
    const beforeResult = await client.query(`
      SELECT id, name, admin_access, app_access
      FROM directus_policies
      WHERE name = 'Administrator'
    `);
    console.table(beforeResult.rows);

    // Force update admin_access to TRUE
    console.log('\n🔧 Forcing admin_access = TRUE...');
    await client.query(`
      UPDATE directus_policies
      SET admin_access = TRUE, app_access = TRUE
      WHERE name = 'Administrator'
    `);

    // Verify
    console.log('✅ Updated!\n');
    console.log('📊 After update:');
    const afterResult = await client.query(`
      SELECT id, name, admin_access, app_access
      FROM directus_policies
      WHERE name = 'Administrator'
    `);
    console.table(afterResult.rows);

    // Check permissions one more time
    console.log('\n📋 Permissions for map_locations (Administrator policy):');
    const permsResult = await client.query(`
      SELECT id, collection, action, fields
      FROM directus_permissions
      WHERE policy = '589ed02d-416c-405b-9f75-b4b99285e584'
      AND collection = 'map_locations'
      ORDER BY action
    `);
    console.table(permsResult.rows);

    console.log('\n✅ Admin access forced to TRUE!');
    console.log('\n⚠️  IMPORTANT: Restart Directus NOW for changes to take effect!');
    console.log('\n🔄 After restart:');
    console.log('   1. Hard refresh browser (Ctrl+Shift+R)');
    console.log('   2. Run: node scripts/fresh-login-and-test.js');
    console.log('   3. If works, run: node scripts/auto-import-locations.js');

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

forceAdminAccess();
