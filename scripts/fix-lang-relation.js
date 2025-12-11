import pg from 'pg';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;
const DIRECTUS_URL = 'http://127.0.0.1:8055';

async function fix() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  await client.connect();

  // Login to Directus
  const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    }),
  });
  const { data: { access_token } } = await loginRes.json();

  console.log('Checking directus_languages primary key...');

  // Check directus_languages schema
  const langSchema = await client.query(`
    SELECT column_name, is_nullable, data_type
    FROM information_schema.columns
    WHERE table_name = 'directus_languages'
  `);
  console.log('directus_languages columns:', langSchema.rows.map(r => r.column_name).join(', '));

  // Check if code is primary key
  const pkCheck = await client.query(`
    SELECT column_name
    FROM information_schema.key_column_usage
    WHERE table_name = 'directus_languages' AND constraint_name LIKE '%pkey%'
  `);
  console.log('Primary key:', pkCheck.rows[0]?.column_name);

  // The issue: translations interface needs to know languages collection uses 'code' field
  // Fix: Update translations field options to specify the correct language template
  console.log('\nUpdating translations field options...');

  const collections = ['map_locations', 'destinasi_wisata', 'agenda_events',
                       'umkm_lokal', 'spot_nongkrong', 'trending_articles', 'encyclopedia_entries'];

  for (const col of collections) {
    // Update via API to ensure proper serialization
    const updateRes = await fetch(`${DIRECTUS_URL}/fields/${col}/translations`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`
      },
      body: JSON.stringify({
        meta: {
          interface: 'translations',
          special: ['translations'],
          options: {
            languageField: 'languages_code',
            languageDirectionField: 'direction',
            defaultLanguage: 'id-ID'
          }
        }
      })
    });

    console.log(`  ${col}: ${updateRes.status}`);
  }

  // Also need to check if languages_code M2O template is correct
  console.log('\nUpdating languages_code field display...');

  for (const col of collections) {
    const transCol = `${col}_translations`;

    await client.query(`
      UPDATE directus_fields
      SET
        display = 'related-values',
        display_options = '{"template": "{{name}}"}'::json
      WHERE collection = $1 AND field = 'languages_code'
    `, [transCol]);
  }

  console.log('\nDone! Restart Directus to apply changes.');

  await client.end();
}

fix().catch(console.error);
