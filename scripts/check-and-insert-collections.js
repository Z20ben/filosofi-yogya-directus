import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function checkAndInsert() {
  console.log('🔍 Checking Collections Structure...\n');

  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();

    // Check directus_collections structure
    console.log('1️⃣ Checking directus_collections structure...\n');

    const structure = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'directus_collections'
      ORDER BY ordinal_position;
    `);

    console.log('   Columns in directus_collections:');
    structure.rows.forEach(row => {
      console.log(`      - ${row.column_name} (${row.data_type})`);
    });

    // Check existing collections
    console.log('\n2️⃣ Checking existing collection entries...\n');

    const existing = await client.query(`
      SELECT * FROM directus_collections
      WHERE collection IN ('destinasi_wisata', 'agenda_events', 'umkm_lokal', 'spot_nongkrong', 'trending_articles', 'encyclopedia_entries');
    `);

    if (existing.rows.length > 0) {
      console.log('   Found existing entries:');
      existing.rows.forEach(row => {
        console.log(`      - ${row.collection}`);
      });
    } else {
      console.log('   ❌ No entries found! Collections not registered.');
    }

    // List all collection entries
    console.log('\n3️⃣ All non-system collections in directus_collections:');

    const all = await client.query(`
      SELECT collection FROM directus_collections
      WHERE collection NOT LIKE 'directus_%'
      ORDER BY collection;
    `);

    all.rows.forEach(row => {
      console.log(`   - ${row.collection}`);
    });

    // Check tables exist in database
    console.log('\n4️⃣ Tables in database (non-directus):');

    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name NOT LIKE 'directus_%'
      ORDER BY table_name;
    `);

    tables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    console.log('\n✅ Check complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkAndInsert().catch(console.error);
