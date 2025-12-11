/**
 * Fix Permissions - Set permissions field to NULL instead of {}
 *
 * Theory: permissions: {} might be interpreted as "no access"
 * permissions: null should mean "no restrictions"
 */

import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function fixPermissionsNull() {
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
      SELECT id, collection, action, permissions::text, validation::text
      FROM directus_permissions
      WHERE collection = 'map_locations'
      AND policy = '589ed02d-416c-405b-9f75-b4b99285e584'
    `);
    console.table(beforeResult.rows);

    // Update permissions to NULL
    console.log('\n🔧 Updating permissions and validation to NULL...');
    await client.query(`
      UPDATE directus_permissions
      SET
        permissions = NULL,
        validation = NULL,
        presets = NULL
      WHERE collection = 'map_locations'
      AND policy = '589ed02d-416c-405b-9f75-b4b99285e584'
    `);

    console.log('✅ Updated!\n');

    // Verify
    console.log('📊 After update:');
    const afterResult = await client.query(`
      SELECT id, collection, action, permissions::text, validation::text
      FROM directus_permissions
      WHERE collection = 'map_locations'
      AND policy = '589ed02d-416c-405b-9f75-b4b99285e584'
    `);
    console.table(afterResult.rows);

    console.log('\n✅ Permissions updated to NULL!');
    console.log('\n💡 NULL should mean "no restrictions" vs {} which might mean "restricted"');
    console.log('\n🔄 Next: Run test WITHOUT restart (should work immediately)');
    console.log('   node scripts/fresh-login-and-test.js');

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

fixPermissionsNull();
