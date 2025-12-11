/**
 * Create Admin Permissions for Map Locations
 *
 * Creates full CRUD permissions for Administrator policy
 */

import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function createAdminPermissions() {
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

    const adminPolicyId = '589ed02d-416c-405b-9f75-b4b99285e584'; // Administrator policy

    // Check existing permissions
    console.log('📋 Checking existing permissions for map_locations...');
    const existingPerms = await client.query(`
      SELECT id, action, policy
      FROM directus_permissions
      WHERE collection = 'map_locations' AND policy = $1
    `, [adminPolicyId]);

    console.log(`   Found ${existingPerms.rows.length} existing permissions\n`);

    // Define permissions to create
    const actions = ['create', 'read', 'update', 'delete'];
    const existingActions = existingPerms.rows.map(p => p.action);

    console.log('➕ Creating permissions...\n');

    for (const action of actions) {
      if (existingActions.includes(action)) {
        console.log(`   ⏭️  ${action} - already exists`);
        continue;
      }

      await client.query(`
        INSERT INTO directus_permissions (collection, action, permissions, validation, presets, fields, policy)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        'map_locations',
        action,
        '{}', // permissions (empty = allow all)
        null, // validation
        null, // presets
        '*',  // fields (all fields)
        adminPolicyId,
      ]);

      console.log(`   ✅ ${action} - permission created`);
    }

    // Verify
    console.log('\n📊 Final permissions for map_locations:');
    const finalPerms = await client.query(`
      SELECT id, action, fields, permissions
      FROM directus_permissions
      WHERE collection = 'map_locations' AND policy = $1
      ORDER BY action
    `, [adminPolicyId]);

    console.table(finalPerms.rows);

    console.log('\n✅ Permissions created successfully!');
    console.log('\n🔄 Next Steps:');
    console.log('   1. NO NEED TO RESTART - permissions are immediate!');
    console.log('   2. Just hard refresh browser (Ctrl+Shift+R)');
    console.log('   3. Run: node scripts/auto-import-locations.js');

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await client.end();
    process.exit(1);
  }
}

createAdminPermissions();
