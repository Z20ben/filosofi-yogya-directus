import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function check() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  await client.connect();

  // Check current relations to directus_languages
  console.log('Current relations to directus_languages:');
  const rels = await client.query(`
    SELECT many_collection, many_field, one_collection, one_field
    FROM directus_relations
    WHERE one_collection = 'directus_languages'
  `);
  rels.rows.forEach(r => {
    console.log('  ' + r.many_collection + '.' + r.many_field + ' -> ' + r.one_collection + '.' + (r.one_field || 'NULL'));
  });

  // Check foreign keys in DB
  console.log('\nForeign keys to directus_languages:');
  const fks = await client.query(`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table,
      ccu.column_name AS foreign_column
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'directus_languages'
  `);
  fks.rows.forEach(r => {
    console.log('  ' + r.table_name + '.' + r.column_name + ' -> ' + r.foreign_table + '.' + r.foreign_column);
  });

  // Check languages_code field meta in translations tables
  console.log('\nlanguages_code field meta:');
  const fieldMeta = await client.query(`
    SELECT collection, field, interface, special, options
    FROM directus_fields
    WHERE field = 'languages_code' AND collection LIKE '%_translations'
    LIMIT 3
  `);
  fieldMeta.rows.forEach(r => {
    console.log('  ' + r.collection + ':');
    console.log('    interface:', r.interface);
    console.log('    special:', r.special);
    console.log('    options:', r.options);
  });

  await client.end();
}

check().catch(console.error);
