import fetch from 'node-fetch';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.PUBLIC_URL || 'http://localhost:8055';
const { Client } = pg;
let accessToken = null;

async function login() {
  const response = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    }),
  });

  if (!response.ok) throw new Error('Login failed');
  const data = await response.json();
  accessToken = data.data.access_token;
}

async function directusRequest(endpoint, options = {}) {
  const url = `${DIRECTUS_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  return { status: response.status, data };
}

async function fixTranslationsField() {
  console.log('🔧 Fixing Translations Field Setup...\n');

  await login();

  // Check current fields
  console.log('1️⃣ Checking current fields...');
  const fieldsCheck = await directusRequest('/fields/map_locations');

  if (fieldsCheck.status === 200) {
    const fields = fieldsCheck.data.data;
    const hasTranslations = fields.some(f => f.field === 'translations');

    console.log(`   Translations field exists: ${hasTranslations ? '✅' : '❌'}`);

    if (hasTranslations) {
      console.log('   Deleting existing translations field...');
      await directusRequest('/fields/map_locations/translations', { method: 'DELETE' });
      console.log('   ✅ Deleted\n');
    }
  }

  // Create proper O2M (One-to-Many) relation
  console.log('2️⃣ Creating O2M relation...');

  const dbClient = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await dbClient.connect();

    // Check and create relation in directus_relations
    console.log('   Registering relation in metadata...');

    const relationCheck = await dbClient.query(`
      SELECT * FROM directus_relations
      WHERE many_collection = 'map_locations_translations'
        AND many_field = 'map_locations_id'
    `);

    if (relationCheck.rows.length === 0) {
      await dbClient.query(`
        INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections)
        VALUES (
          'map_locations_translations',
          'map_locations_id',
          'map_locations',
          'translations',
          NULL,
          NULL
        )
      `);
      console.log('   ✅ Relation registered');
    } else {
      console.log('   ✅ Relation already exists');
    }

    // Check and create language relation
    console.log('   Registering language relation...');

    const langRelationCheck = await dbClient.query(`
      SELECT * FROM directus_relations
      WHERE many_collection = 'map_locations_translations'
        AND many_field = 'languages_code'
    `);

    if (langRelationCheck.rows.length === 0) {
      await dbClient.query(`
        INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections)
        VALUES (
          'map_locations_translations',
          'languages_code',
          'directus_languages',
          NULL,
          NULL,
          NULL
        )
      `);
      console.log('   ✅ Language relation registered');
    } else {
      console.log('   ✅ Language relation already exists');
    }

  } catch (error) {
    console.log('   ❌ Error:', error.message);
  } finally {
    await dbClient.end();
  }

  // Create translations field via API
  console.log('\n3️⃣ Creating translations field via API...');

  const createResult = await directusRequest('/fields/map_locations', {
    method: 'POST',
    body: JSON.stringify({
      field: 'translations',
      type: 'alias',
      meta: {
        interface: 'list-o2m',
        special: ['o2m'],
        options: {
          template: '{{languages_code}}: {{name}}'
        },
        display: 'related-values',
        display_options: {
          template: '{{languages_code}}: {{name}}'
        }
      }
    })
  });

  if (createResult.status === 200 || createResult.status === 201) {
    console.log('   ✅ Translations field created');
  } else if (createResult.status === 400 && createResult.data.errors?.[0]?.message?.includes('already exists')) {
    console.log('   ✅ Translations field already exists');
  } else {
    console.log('   ⚠️  Status:', createResult.status);
    console.log('   Response:', JSON.stringify(createResult.data, null, 2));
  }

  console.log('\n✅ Fix complete!');
  console.log('\n📋 Please:');
  console.log('   1. Restart Directus');
  console.log('   2. Hard refresh browser');
  console.log('   3. Check map_locations in UI for translations interface');
}

fixTranslationsField().catch(console.error);
