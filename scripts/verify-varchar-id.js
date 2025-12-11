/**
 * Verify VARCHAR ID Change
 */

import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function verifyVarcharId() {
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

    // Check id column type
    console.log('📊 Current id column type:');
    const structure = await client.query(`
      SELECT column_name, data_type, character_maximum_length, column_default
      FROM information_schema.columns
      WHERE table_name = 'map_locations' AND column_name = 'id'
    `);
    console.table(structure.rows);

    const isVarchar = structure.rows[0].data_type === 'character varying';
    const hasAutoIncrement = structure.rows[0].column_default !== null;

    if (isVarchar && !hasAutoIncrement) {
      console.log('✅ ID is now VARCHAR without auto-increment!\n');

      // Try to insert with string ID directly in DB
      console.log('🧪 Testing INSERT with string ID (via DB)...');

      const testId = 'test-string-id-' + Date.now();

      await client.query(`
        INSERT INTO map_locations (
          id, name_id, name_en, description_id, description_en,
          category, latitude, longitude, address_id, address_en, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        testId, 'Test String ID', 'Test String ID',
        'Test', 'Test', 'heritage', -7.8, 110.3,
        'Test', 'Test', 'draft'
      ]);

      console.log('   ✅ INSERT with string ID works in DB!');
      console.log('   Test ID:', testId);

      // Clean up
      await client.query('DELETE FROM map_locations WHERE id = $1', [testId]);
      console.log('   🗑️  Test record deleted');

      console.log('\n🎉 Database ready for string IDs!');
      console.log('\n⚠️  IMPORTANT: Restart Directus untuk changes take effect');
      console.log('\n🔄 After restart:');
      console.log('   Run: node scripts/test-string-id-api.js');

    } else {
      console.log('❌ ID type not properly changed');
      console.log('   Is VARCHAR:', isVarchar);
      console.log('   Has auto-increment:', hasAutoIncrement);
    }

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

verifyVarcharId();
