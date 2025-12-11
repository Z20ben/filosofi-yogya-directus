/**
 * Delete Explicit Permissions and Rely on Admin Access
 *
 * Theory: admin_access: true should bypass all permissions
 * But explicit permissions might be interfering
 */

import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function deleteExplicitPermissions() {
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

    // Check current permissions
    console.log('📋 Current permissions for map_locations:');
    const beforeResult = await client.query(`
      SELECT id, collection, action, policy
      FROM directus_permissions
      WHERE collection = 'map_locations'
      AND policy = '589ed02d-416c-405b-9f75-b4b99285e584'
    `);
    console.table(beforeResult.rows);

    if (beforeResult.rows.length === 0) {
      console.log('   No permissions to delete');
      await client.end();
      process.exit(0);
    }

    // Delete them
    console.log('\n🗑️  Deleting explicit permissions...');
    await client.query(`
      DELETE FROM directus_permissions
      WHERE collection = 'map_locations'
      AND policy = '589ed02d-416c-405b-9f75-b4b99285e584'
    `);

    console.log('✅ Deleted!\n');

    // Verify admin_access is still true
    console.log('📊 Verifying Administrator policy still has admin_access:');
    const policyResult = await client.query(`
      SELECT id, name, admin_access, app_access
      FROM directus_policies
      WHERE id = '589ed02d-416c-405b-9f75-b4b99285e584'
    `);
    console.table(policyResult.rows);

    console.log('\n✅ Explicit permissions deleted!');
    console.log('\n💡 Theory: With admin_access: true, Administrator should have');
    console.log('   full access to ALL collections without explicit permissions.');
    console.log('\n🔄 Next steps:');
    console.log('   1. Restart Directus');
    console.log('   2. Run: node scripts/fresh-login-and-test.js');

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

deleteExplicitPermissions();
