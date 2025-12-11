import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function analyzeStructure() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('🔍 Analyzing Current Structure...\n');

    // 1. Check directus_translations table structure
    console.log('1️⃣ directus_translations table structure:');
    const translationsSchema = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'directus_translations'
      ORDER BY ordinal_position;
    `);
    translationsSchema.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    const translationsCount = await client.query('SELECT COUNT(*) FROM directus_translations');
    console.log(`   Total records: ${translationsCount.rows[0].count}\n`);

    // 2. Check if there's directus_languages
    const hasLanguages = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'directus_languages'
      );
    `);
    console.log(`2️⃣ directus_languages table exists: ${hasLanguages.rows[0].exists ? '✅ YES' : '❌ NO'}\n`);

    // 3. Check map_locations fields
    console.log('3️⃣ map_locations fields:');
    const mapFields = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'map_locations'
      ORDER BY ordinal_position;
    `);

    const translatable = [];
    const nonTranslatable = [];

    mapFields.rows.forEach(row => {
      const name = row.column_name;
      if (name.endsWith('_id') || name.endsWith('_en')) {
        translatable.push(`${name} (${row.data_type})`);
      } else if (!['id', 'status', 'date_created', 'date_updated', 'user_created', 'user_updated'].includes(name)) {
        nonTranslatable.push(`${name} (${row.data_type})`);
      }
    });

    console.log('   🌍 Fields with _id/_en (translatable):');
    translatable.forEach(f => console.log(`      - ${f}`));

    console.log('\n   🔧 Other fields (non-translatable):');
    nonTranslatable.forEach(f => console.log(`      - ${f}`));

    const mapCount = await client.query('SELECT COUNT(*) FROM map_locations');
    console.log(`\n   Total records: ${mapCount.rows[0].count}`);

    // 4. Check other collections
    const collections = ['agenda_events', 'destinasi_wisata', 'encyclopedia_entries', 'spot_nongkrong', 'trending_articles', 'umkm_lokal'];

    console.log('\n4️⃣ Other collections status:\n');

    for (const coll of collections) {
      const count = await client.query(`SELECT COUNT(*) FROM ${coll}`);
      const fields = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [coll]);

      const hasTranslatable = fields.rows.some(r => r.column_name.endsWith('_id') || r.column_name.endsWith('_en'));

      console.log(`   📦 ${coll}:`);
      console.log(`      Records: ${count.rows[0].count}`);
      console.log(`      Fields: ${fields.rows.length}`);
      console.log(`      Has _id/_en fields: ${hasTranslatable ? '✅ YES' : '❌ NO'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

analyzeStructure().catch(console.error);
