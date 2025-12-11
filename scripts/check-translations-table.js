import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function checkTranslationsTable() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('🔍 Checking Translations Setup...\n');

    // Check directus_languages
    console.log('1️⃣ directus_languages:');
    const langs = await client.query('SELECT * FROM directus_languages ORDER BY code');
    if (langs.rows.length > 0) {
      console.log('✅ Languages found:');
      langs.rows.forEach(row => {
        console.log(`   🌍 ${row.code}: ${row.name} (${row.direction})`);
      });
    } else {
      console.log('❌ No languages found');
    }

    // Check if map_locations_translations exists
    console.log('\n2️⃣ map_locations_translations table:');
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'map_locations_translations'
      );
    `);

    if (tableExists.rows[0].exists) {
      console.log('✅ Table exists!');

      // Check structure
      const structure = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'map_locations_translations'
        ORDER BY ordinal_position;
      `);

      console.log('\n   📋 Table structure:');
      structure.rows.forEach(row => {
        console.log(`      - ${row.column_name}: ${row.data_type}`);
      });

      // Check record count
      const count = await client.query('SELECT COUNT(*) FROM map_locations_translations');
      console.log(`\n   📊 Total translations: ${count.rows[0].count}`);

    } else {
      console.log('❌ Table does NOT exist');
      console.log('\n   Please enable translations in Directus UI:');
      console.log('   1. Settings → Data Model → map_locations');
      console.log('   2. Enable translations for the collection');
      console.log('   3. Or enable per-field translations');
    }

    // Check new single fields in map_locations
    console.log('\n3️⃣ New translatable fields in map_locations:');
    const newFields = ['name', 'description', 'address', 'opening_hours', 'ticket_price'];

    for (const field of newFields) {
      const exists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'map_locations' AND column_name = $1
        );
      `, [field]);

      const status = exists.rows[0].exists ? '✅' : '❌';
      console.log(`   ${status} ${field}`);
    }

    console.log('\n✅ Check complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTranslationsTable().catch(console.error);
