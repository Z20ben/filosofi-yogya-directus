/**
 * Create Permissions for Map Locations via Database
 *
 * Adds full CRUD permissions for Administrator role
 */

import 'dotenv/config';
import pg from 'pg';
import { randomUUID } from 'crypto';

const { Client } = pg;

async function createPermissions() {
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

    const roleId = 'a9005e30-4f11-40a2-994d-09b923c023a7'; // Administrator role ID

    // Check existing permissions
    console.log('📋 Checking existing permissions for map_locations...');
    const existingPerms = await client.query(`
      SELECT id, action, role
      FROM directus_permissions
      WHERE collection = 'map_locations' AND role = $1
    `, [roleId]);

    console.log(`   Found ${existingPerms.rows.length} existing permissions`);

    // Define permissions to create
    const actions = ['create', 'read', 'update', 'delete'];
    const existingActions = existingPerms.rows.map(p => p.action);

    console.log('\n➕ Creating missing permissions...\n');

    for (const action of actions) {
      if (existingActions.includes(action)) {
        console.log(`   ⏭️  ${action} - already exists`);
        continue;
      }

      const permId = randomUUID();

      await client.query(`
        INSERT INTO directus_permissions (id, role, collection, action, permissions, validation, presets, fields)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        permId,
        roleId,
        'map_locations',
        action,
        '{}', // permissions (empty = allow all)
        null, // validation
        null, // presets
        '*',  // fields (all fields)
      ]);

      console.log(`   ✅ ${action} - permission created (${permId})`);
    }

    // Verify
    console.log('\n📊 Final permissions for map_locations:');
    const finalPerms = await client.query(`
      SELECT id, action, fields, permissions
      FROM directus_permissions
      WHERE collection = 'map_locations' AND role = $1
      ORDER BY action
    `, [roleId]);

    console.table(finalPerms.rows);

    console.log('\n✅ Permissions created successfully!');
    console.log('\n🔄 Next Steps:');
    console.log('   1. Restart Directus server');
    console.log('   2. Hard refresh browser (Ctrl+Shift+R)');
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

createPermissions();
