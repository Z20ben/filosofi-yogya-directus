/**
 * Change ID Column to VARCHAR (Simple Version)
 *
 * Without updating Directus metadata (will be auto-detected)
 */

import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function changeIdToVarchar() {
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

    // Check current structure
    console.log('📊 Current id column:');
    const before = await client.query(`
      SELECT data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'map_locations' AND column_name = 'id'
    `);
    console.table(before.rows);

    // Check existing data
    console.log('\n📋 Existing data:');
    const existingData = await client.query('SELECT id, name_id FROM map_locations LIMIT 5');
    console.table(existingData.rows);

    console.log('\n🔧 Converting ID column...\n');

    // Step 1: Drop auto-increment
    console.log('Step 1: Dropping auto-increment sequence...');
    await client.query(`ALTER TABLE map_locations ALTER COLUMN id DROP DEFAULT`);
    console.log('   ✅ Done');

    // Step 2: Drop the sequence
    console.log('Step 2: Dropping sequence...');
    await client.query(`DROP SEQUENCE IF EXISTS map_locations_id_seq CASCADE`);
    console.log('   ✅ Done');

    // Step 3: Convert to VARCHAR
    console.log('Step 3: Converting to VARCHAR(255)...');
    await client.query(`ALTER TABLE map_locations ALTER COLUMN id TYPE VARCHAR(255) USING id::VARCHAR`);
    console.log('   ✅ Done');

    // Verify
    console.log('\n📊 New id column:');
    const after = await client.query(`
      SELECT data_type, character_maximum_length, column_default
      FROM information_schema.columns
      WHERE table_name = 'map_locations' AND column_name = 'id'
    `);
    console.table(after.rows);

    console.log('\n🎉 SUCCESS! ID column changed to VARCHAR(255)');
    console.log('\n📋 Summary:');
    console.log('   • Old: INTEGER with auto-increment');
    console.log('   • New: VARCHAR(255) without auto-increment');
    console.log('   • Existing IDs: Converted from numbers to strings');
    console.log('\n⚠️  CRITICAL: Restart Directus NOW!');
    console.log('   Directus needs to reload schema from database');
    console.log('\n🔄 After restart:');
    console.log('   Run: node scripts/test-string-id-api.js');

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    await client.end();
    process.exit(1);
  }
}

changeIdToVarchar();
