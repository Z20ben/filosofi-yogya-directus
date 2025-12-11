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

  if (response.status === 204) {
    return { status: 204, data: null };
  }

  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function createDestinasiWisata() {
  console.log('🏗️  Creating destinasi_wisata with Translations...\n');

  await login();

  const dbClient = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await dbClient.connect();

    // Step 1: Create main table via database
    console.log('1️⃣ Creating main table...');

    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS destinasi_wisata (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(255) UNIQUE NOT NULL,

        -- Translatable fields (Indonesian as default)
        name VARCHAR(255),
        location VARCHAR(255),
        description TEXT,
        hours VARCHAR(255),

        -- Non-translatable fields
        image UUID REFERENCES directus_files(id) ON DELETE SET NULL,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),

        -- Metadata
        status VARCHAR(20) DEFAULT 'draft',
        sort INTEGER,
        user_created UUID REFERENCES directus_users(id) ON DELETE SET NULL,
        date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        user_updated UUID REFERENCES directus_users(id) ON DELETE SET NULL,
        date_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('   ✅ Main table created');

    // Step 2: Create translations table
    console.log('\n2️⃣ Creating translations table...');

    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS destinasi_wisata_translations (
        id SERIAL PRIMARY KEY,
        destinasi_wisata_id INTEGER REFERENCES destinasi_wisata(id) ON DELETE CASCADE,
        languages_code VARCHAR(255) REFERENCES directus_languages(code) ON DELETE CASCADE,
        name VARCHAR(255),
        location VARCHAR(255),
        description TEXT,
        hours VARCHAR(255),
        UNIQUE(destinasi_wisata_id, languages_code)
      );
    `);

    console.log('   ✅ Translations table created');

  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('   ⏭️  Tables already exist');
    } else {
      console.log('   ❌ Error:', error.message);
    }
  } finally {
    await dbClient.end();
  }

  // Step 3: Register collection in Directus
  console.log('\n3️⃣ Registering collection...');

  const collectionResult = await directusRequest('/collections', {
    method: 'POST',
    body: JSON.stringify({
      collection: 'destinasi_wisata',
      meta: {
        icon: 'place',
        note: 'Tourist Destinations / Destinasi Wisata',
        display_template: '{{name}}',
        hidden: false,
        singleton: false,
        translations: [
          { language: 'id-ID', translation: 'Destinasi Wisata', singular: 'Destinasi', plural: 'Destinasi' },
          { language: 'en-US', translation: 'Tourist Destinations', singular: 'Destination', plural: 'Destinations' }
        ]
      },
      schema: {
        name: 'destinasi_wisata'
      }
    })
  });

  if (collectionResult.status === 200 || collectionResult.status === 201) {
    console.log('   ✅ Collection registered');
  } else if (collectionResult.data.errors?.[0]?.message?.includes('already exists')) {
    console.log('   ⏭️  Collection already registered');
  } else {
    console.log('   ⚠️  Status:', collectionResult.status);
  }

  // Step 4: Register translations collection
  console.log('\n4️⃣ Registering translations collection...');

  const transCollectionResult = await directusRequest('/collections', {
    method: 'POST',
    body: JSON.stringify({
      collection: 'destinasi_wisata_translations',
      meta: {
        icon: 'translate',
        hidden: true
      }
    })
  });

  if (transCollectionResult.status === 200 || transCollectionResult.status === 201) {
    console.log('   ✅ Translations collection registered');
  } else if (transCollectionResult.data.errors?.[0]?.message?.includes('already exists')) {
    console.log('   ⏭️  Already registered');
  }

  // Step 5: Create relations
  console.log('\n5️⃣ Creating relations...');

  await dbClient.connect();

  try {
    // O2M relation: destinasi_wisata -> destinasi_wisata_translations
    await dbClient.query(`
      INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, junction_field)
      VALUES (
        'destinasi_wisata_translations',
        'destinasi_wisata_id',
        'destinasi_wisata',
        'translations',
        'languages_code'
      )
      ON CONFLICT DO NOTHING;
    `);

    // M2O relation: destinasi_wisata_translations -> directus_languages
    await dbClient.query(`
      INSERT INTO directus_relations (many_collection, many_field, one_collection)
      VALUES (
        'destinasi_wisata_translations',
        'languages_code',
        'directus_languages'
      )
      ON CONFLICT DO NOTHING;
    `);

    console.log('   ✅ Relations created');

  } catch (error) {
    console.log('   ⚠️  Error:', error.message);
  } finally {
    await dbClient.end();
  }

  // Step 6: Create translations field
  console.log('\n6️⃣ Creating translations field...');

  const transFieldResult = await directusRequest('/fields/destinasi_wisata', {
    method: 'POST',
    body: JSON.stringify({
      field: 'translations',
      type: 'alias',
      meta: {
        interface: 'list-o2m',
        special: ['o2m'],
        options: {
          template: '{{languages_code}}: {{name}}'
        }
      }
    })
  });

  if (transFieldResult.status === 200 || transFieldResult.status === 201) {
    console.log('   ✅ Translations field created');
  } else if (transFieldResult.data.errors?.[0]?.message?.includes('already exists')) {
    console.log('   ⏭️  Already exists');
  }

  // Step 7: Mark translatable fields
  console.log('\n7️⃣ Marking translatable fields...');

  const translatableFields = ['name', 'location', 'description', 'hours'];

  await dbClient.connect();

  for (const field of translatableFields) {
    try {
      await dbClient.query(`
        UPDATE directus_fields
        SET special = ARRAY['translations']::text[]
        WHERE collection = 'destinasi_wisata'
          AND field = $1;
      `, [field]);

      console.log(`   ✅ ${field} marked as translatable`);
    } catch (error) {
      console.log(`   ⚠️  ${field}:`, error.message);
    }
  }

  await dbClient.end();

  console.log('\n✅ destinasi_wisata created successfully!');
  console.log('\n📋 Structure:');
  console.log('   - Main table: destinasi_wisata (id, slug, name, location, description, hours, ...)');
  console.log('   - Translations: destinasi_wisata_translations (en-US)');
  console.log('   - Translatable fields: name, location, description, hours');
}

createDestinasiWisata().catch(console.error);
