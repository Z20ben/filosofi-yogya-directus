import fetch from 'node-fetch';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.PUBLIC_URL || 'http://localhost:8055';
const { Client } = pg;
let accessToken = null;

async function login() {
  console.log('🔐 Authenticating...');
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
  console.log('✅ Authenticated\n');
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

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

async function setupContentTranslations() {
  console.log('🌍 Setting Up Content Translations for map_locations...\n');

  await login();

  // Step 1: Check if directus_languages has data
  console.log('1️⃣ Checking languages...');
  const langsResponse = await directusRequest('/items/directus_languages');
  const languages = langsResponse.data || [];

  if (languages.length === 0) {
    console.log('❌ No languages found in directus_languages!');
    console.log('   Creating languages...\n');

    // Create languages via API
    await directusRequest('/items/directus_languages', {
      method: 'POST',
      body: JSON.stringify({ code: 'id-ID', name: 'Indonesian', direction: 'ltr' })
    });

    await directusRequest('/items/directus_languages', {
      method: 'POST',
      body: JSON.stringify({ code: 'en-US', name: 'English', direction: 'ltr' })
    });

    console.log('✅ Languages created\n');
  } else {
    console.log('✅ Languages found:');
    languages.forEach(l => console.log(`   🌍 ${l.code}: ${l.name}`));
    console.log();
  }

  // Step 2: Create translations junction table manually via database
  console.log('2️⃣ Creating map_locations_translations table...');

  const dbClient = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await dbClient.connect();

    // Check if table exists
    const tableCheck = await dbClient.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'map_locations_translations'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('   Creating table...');

      await dbClient.query(`
        CREATE TABLE map_locations_translations (
          id SERIAL PRIMARY KEY,
          map_locations_id VARCHAR(255) REFERENCES map_locations(id) ON DELETE CASCADE,
          languages_code VARCHAR(255) REFERENCES directus_languages(code) ON DELETE CASCADE,
          name VARCHAR(255),
          description TEXT,
          address VARCHAR(500),
          opening_hours VARCHAR(255),
          ticket_price VARCHAR(255),
          UNIQUE(map_locations_id, languages_code)
        );
      `);

      console.log('   ✅ Table created\n');
    } else {
      console.log('   ✅ Table already exists\n');
    }

  } catch (error) {
    console.log('   ❌ Error:', error.message);
  } finally {
    await dbClient.end();
  }

  // Step 3: Register collection in Directus
  console.log('3️⃣ Registering translations collection in Directus...');

  try {
    // Check if collection already registered
    const collectionsResponse = await directusRequest('/collections/map_locations_translations');

    console.log('   ✅ Already registered\n');
  } catch (error) {
    // Not registered, create it
    try {
      await directusRequest('/collections', {
        method: 'POST',
        body: JSON.stringify({
          collection: 'map_locations_translations',
          meta: {
            icon: 'translate',
            hidden: false,
            singleton: false,
          },
          schema: {
            name: 'map_locations_translations'
          }
        })
      });

      console.log('   ✅ Collection registered\n');
    } catch (err) {
      console.log('   ⚠️  Could not register:', err.message);
      console.log('   This is OK - Directus may auto-detect it\n');
    }
  }

  // Step 4: Create relation (M2M setup)
  console.log('4️⃣ Setting up M2M relation...');

  try {
    // Create translations field in map_locations (many-to-many)
    await directusRequest('/fields/map_locations', {
      method: 'POST',
      body: JSON.stringify({
        field: 'translations',
        type: 'alias',
        meta: {
          interface: 'translations',
          special: ['translations'],
          options: {
            languageField: 'languages_code',
            translationsCollections: ['map_locations_translations'],
            translationsField: 'map_locations_id',
          }
        }
      })
    });

    console.log('   ✅ Translations field created\n');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('   ✅ Translations field already exists\n');
    } else {
      console.log('   ⚠️  Error:', error.message);
      console.log('   May need manual setup in UI\n');
    }
  }

  console.log('✅ Setup complete!');
  console.log('\n📋 Next steps:');
  console.log('   1. Check Directus UI - map_locations should show translations interface');
  console.log('   2. Run: node scripts/migrate-map-locations-step2-migrate-data.js');
  console.log('   3. This will migrate data from _id/_en to translations table');
}

setupContentTranslations().catch(console.error);
