/**
 * Check Facilities Field Type
 */

import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function checkFacilitiesField() {
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

    // Check facilities field
    console.log('📊 Facilities field structure:');
    const result = await client.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'map_locations' AND column_name = 'facilities'
    `);
    console.table(result.rows);

    if (result.rows.length > 0 && result.rows[0].data_type === 'json') {
      console.log('\n💡 Facilities is JSON type!');
      console.log('   Must send as JSON array, not pipe-separated string');
      console.log('   Correct: ["Toilet", "Parkir", "Mushola"]');
      console.log('   Wrong: "Toilet|Parkir|Mushola"');
    }

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

checkFacilitiesField();
