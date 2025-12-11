/**
 * Change ID Column from INTEGER to VARCHAR
 *
 * This allows us to use string IDs like "keraton-yogyakarta"
 * instead of auto-increment integers
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

    // Check current id column type
    console.log('📊 Current id column structure:');
    const currentStructure = await client.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'map_locations' AND column_name = 'id'
    `);
    console.table(currentStructure.rows);

    // Check existing data
    console.log('\n📋 Existing data in table:');
    const existingData = await client.query('SELECT id, name_id FROM map_locations');
    console.table(existingData.rows);

    if (existingData.rows.length > 0) {
      console.log('\n⚠️  WARNING: Table has existing data!');
      console.log('   We need to handle existing integer IDs before changing type.');
      console.log('\n💡 Options:');
      console.log('   1. Delete existing data (if test data only)');
      console.log('   2. Convert existing IDs to strings (e.g., id 6 → "location-6")');
      console.log('\n   Which option? (continuing with option 2 - convert to strings)');
    }

    // Start transaction
    await client.query('BEGIN');

    try {
      // Step 1: Drop the default (auto-increment sequence)
      console.log('\n🔧 Step 1: Removing auto-increment...');
      await client.query(`
        ALTER TABLE map_locations
        ALTER COLUMN id DROP DEFAULT
      `);
      console.log('   ✅ Auto-increment removed');

      // Step 2: Change column type to VARCHAR
      console.log('\n🔧 Step 2: Converting id to VARCHAR...');
      await client.query(`
        ALTER TABLE map_locations
        ALTER COLUMN id TYPE VARCHAR(255) USING id::VARCHAR
      `);
      console.log('   ✅ Column type changed to VARCHAR(255)');

      // Step 3: Update Directus field metadata via direct update
      console.log('\n🔧 Step 3: Updating Directus field metadata...');
      await client.query(`
        UPDATE directus_fields
        SET schema = jsonb_set(
          COALESCE(schema, '{}'::jsonb),
          '{has_auto_increment}',
          'false'::jsonb
        )
        WHERE collection = 'map_locations' AND field = 'id'
      `);
      console.log('   ✅ Directus metadata updated');

      // Commit transaction
      await client.query('COMMIT');
      console.log('\n✅ Transaction committed!');

      // Verify the change
      console.log('\n📊 New id column structure:');
      const newStructure = await client.query(`
        SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'map_locations' AND column_name = 'id'
      `);
      console.table(newStructure.rows);

      console.log('\n🎉 SUCCESS! ID column changed to VARCHAR');
      console.log('\n📋 Summary:');
      console.log('   • ID type: INTEGER → VARCHAR(255)');
      console.log('   • Auto-increment: Removed');
      console.log('   • Can now use: "keraton-yogyakarta" as ID');
      console.log('\n⚠️  IMPORTANT: Restart Directus for changes to take effect!');
      console.log('\n🔄 After restart:');
      console.log('   1. Run: node scripts/test-string-id.js');
      console.log('   2. If works: node scripts/auto-import-locations.js');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

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
