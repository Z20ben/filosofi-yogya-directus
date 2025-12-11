import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function fix() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  await client.connect();

  // Check current raw values
  console.log('Current special values (raw):');
  const current = await client.query(
    "SELECT collection, special FROM directus_fields WHERE field = 'translations'"
  );
  current.rows.forEach(r => {
    console.log(`  ${r.collection}: |${r.special}|`);
  });

  // The special field is VARCHAR, Directus expects JSON array string: ["translations"]
  // Fix to exact format
  console.log('\nFixing to correct format: ["translations"]');

  const correctValue = '["translations"]';
  const result = await client.query(
    "UPDATE directus_fields SET special = $1 WHERE field = 'translations' AND interface = 'translations'",
    [correctValue]
  );
  console.log('Updated:', result.rowCount);

  // Also fix m2o fields that might be wrong
  console.log('\nFixing m2o fields...');
  const m2oResult = await client.query(
    "UPDATE directus_fields SET special = $1 WHERE special LIKE '%m2o%' AND special != $1",
    ['["m2o"]']
  );
  console.log('Updated m2o:', m2oResult.rowCount);

  // Verify
  console.log('\nAfter fix:');
  const after = await client.query(
    "SELECT collection, field, special FROM directus_fields WHERE field = 'translations' OR (field = 'languages_code' AND collection LIKE '%_translations')"
  );
  after.rows.forEach(r => {
    console.log(`  ${r.collection}.${r.field}: |${r.special}|`);
  });

  await client.end();
  console.log('\nRestart Directus!');
}

fix().catch(console.error);
