import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const TRANSLATIONS_TABLES = [
  'map_locations_translations',
  'destinasi_wisata_translations',
  'agenda_events_translations',
  'umkm_lokal_translations',
  'spot_nongkrong_translations',
  'trending_articles_translations',
  'encyclopedia_entries_translations',
];

async function rename() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  await client.connect();

  console.log('Renaming languages_code -> code in all translations tables\n');

  for (const table of TRANSLATIONS_TABLES) {
    console.log(`Processing ${table}...`);

    try {
      // Rename column
      await client.query(`ALTER TABLE ${table} RENAME COLUMN languages_code TO code`);
      console.log('  ✅ Column renamed');

      // Update directus_fields
      await client.query(
        `UPDATE directus_fields SET field = 'code' WHERE collection = $1 AND field = 'languages_code'`,
        [table]
      );
      console.log('  ✅ directus_fields updated');

      // Update directus_relations
      await client.query(
        `UPDATE directus_relations SET many_field = 'code' WHERE many_collection = $1 AND many_field = 'languages_code'`,
        [table]
      );
      await client.query(
        `UPDATE directus_relations SET junction_field = 'code' WHERE junction_field = 'languages_code' AND many_collection = $1`,
        [table]
      );
      console.log('  ✅ directus_relations updated');

    } catch (err) {
      console.log('  ❌ Error:', err.message);
    }
  }

  // Update translations field options
  console.log('\nUpdating translations field options...');
  const newOptions = JSON.stringify({ languageField: 'code' });
  await client.query(
    `UPDATE directus_fields SET options = $1 WHERE field = 'translations' AND interface = 'translations'`,
    [newOptions]
  );
  console.log('✅ Options updated to use "code"');

  // Verify
  console.log('\nVerification:');
  const verify = await client.query(
    `SELECT table_name, column_name FROM information_schema.columns
     WHERE table_name LIKE '%_translations' AND column_name IN ('code', 'languages_code')
     ORDER BY table_name`
  );
  verify.rows.forEach(r => console.log(`  ${r.table_name}: ${r.column_name}`));

  await client.end();
  console.log('\n✅ Done! Restart Directus.');
}

rename().catch(console.error);
