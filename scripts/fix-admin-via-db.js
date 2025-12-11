/**
 * Fix Administrator Role via Direct Database Access
 *
 * Updates the role directly in PostgreSQL
 */

import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function fixAdminViaDB() {
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
    console.log('📊 Current Administrator role:');
    const checkResult = await client.query(`
      SELECT id, name, admin_access, app_access
      FROM directus_roles
      WHERE name = 'Administrator' OR id = 'a9005e30-4f11-40a2-994d-09b923c023a7'
    `);

    if (checkResult.rows.length === 0) {
      console.log('❌ Administrator role not found!');
      process.exit(1);
    }

    console.log('   Name:', checkResult.rows[0].name);
    console.log('   ID:', checkResult.rows[0].id);
    console.log('   admin_access:', checkResult.rows[0].admin_access);
    console.log('   app_access:', checkResult.rows[0].app_access);

    // Update the role
    console.log('\n🔧 Updating Administrator role...');
    await client.query(`
      UPDATE directus_roles
      SET
        admin_access = true,
        app_access = true
      WHERE name = 'Administrator' OR id = 'a9005e30-4f11-40a2-994d-09b923c023a7'
    `);

    // Verify the change
    console.log('✅ Updated!\n');
    console.log('📊 New Administrator role:');
    const verifyResult = await client.query(`
      SELECT id, name, admin_access, app_access
      FROM directus_roles
      WHERE name = 'Administrator' OR id = 'a9005e30-4f11-40a2-994d-09b923c023a7'
    `);

    console.log('   Name:', verifyResult.rows[0].name);
    console.log('   ID:', verifyResult.rows[0].id);
    console.log('   admin_access:', verifyResult.rows[0].admin_access);
    console.log('   app_access:', verifyResult.rows[0].app_access);

    console.log('\n✅ Administrator role fixed!');
    console.log('\n🔄 Next Steps:');
    console.log('   1. Restart Directus server');
    console.log('   2. Hard refresh browser (Ctrl+Shift+R)');
    console.log('   3. Run: node scripts/auto-import-locations.js');

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

fixAdminViaDB();
