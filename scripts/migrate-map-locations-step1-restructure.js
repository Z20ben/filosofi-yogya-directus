import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.PUBLIC_URL || 'http://localhost:8055';
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
  console.log('✅ Authentication successful\n');
}

async function directusRequest(endpoint, options = {}) {
  const url = `${DIRECTUS_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(error)}`);
  }

  return response.json();
}

async function restructureCollection() {
  console.log('🔄 Restructuring map_locations for Directus Translations...\n');

  await login();

  // Check if languages are available
  console.log('1️⃣ Checking languages...');
  try {
    const langsResponse = await directusRequest('/items/directus_languages');
    const langs = langsResponse.data || [];

    if (langs.length === 0) {
      console.log('❌ No languages found!');
      console.log('   Please restart Directus first to recognize languages.');
      return;
    }

    console.log('✅ Available languages:');
    langs.forEach(lang => console.log(`   - ${lang.code}: ${lang.name}`));
    console.log();

  } catch (error) {
    console.log('❌ Cannot access languages:', error.message);
    console.log('   Make sure:');
    console.log('   1. Directus is restarted');
    console.log('   2. Languages are properly set up\n');
    return;
  }

  // Define translatable fields to create
  const translatableFields = [
    {
      field: 'name',
      type: 'string',
      schema: { max_length: 255 },
      meta: {
        interface: 'input',
        width: 'full',
        translations: [
          { language: 'id-ID', translation: 'Nama' },
          { language: 'en-US', translation: 'Name' }
        ]
      }
    },
    {
      field: 'description',
      type: 'text',
      meta: {
        interface: 'input-rich-text-html',
        width: 'full',
        translations: [
          { language: 'id-ID', translation: 'Deskripsi' },
          { language: 'en-US', translation: 'Description' }
        ]
      }
    },
    {
      field: 'address',
      type: 'string',
      schema: { max_length: 500 },
      meta: {
        interface: 'input',
        width: 'full',
        translations: [
          { language: 'id-ID', translation: 'Alamat' },
          { language: 'en-US', translation: 'Address' }
        ]
      }
    },
    {
      field: 'opening_hours',
      type: 'string',
      schema: { max_length: 255 },
      meta: {
        interface: 'input',
        width: 'half',
        translations: [
          { language: 'id-ID', translation: 'Jam Buka' },
          { language: 'en-US', translation: 'Opening Hours' }
        ]
      }
    },
    {
      field: 'ticket_price',
      type: 'string',
      schema: { max_length: 255 },
      meta: {
        interface: 'input',
        width: 'half',
        translations: [
          { language: 'id-ID', translation: 'Harga Tiket' },
          { language: 'en-US', translation: 'Ticket Price' }
        ]
      }
    }
  ];

  console.log('2️⃣ Creating new translatable fields...\n');

  for (const fieldDef of translatableFields) {
    try {
      console.log(`   Creating field: ${fieldDef.field}...`);

      await directusRequest(`/fields/map_locations`, {
        method: 'POST',
        body: JSON.stringify(fieldDef)
      });

      console.log(`   ✅ ${fieldDef.field} created`);

    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log(`   ⏭️  ${fieldDef.field} already exists`);
      } else {
        console.log(`   ❌ ${fieldDef.field} failed:`, error.message);
      }
    }
  }

  console.log('\n3️⃣ Enabling translations for collection...');

  try {
    // Update collection to enable translations
    await directusRequest(`/collections/map_locations`, {
      method: 'PATCH',
      body: JSON.stringify({
        meta: {
          translations: translatableFields.map(f => ({
            language: 'id-ID',
            translation: f.field,
            singular: f.meta.translations[0].translation,
            plural: f.meta.translations[0].translation
          }))
        }
      })
    });

    console.log('✅ Translations enabled for collection\n');

  } catch (error) {
    console.log('⚠️  Could not enable translations:', error.message);
    console.log('   This might need to be done via Directus UI\n');
  }

  console.log('✅ Step 1 Complete!');
  console.log('\n📋 Next steps:');
  console.log('   1. Check Directus UI - new fields should appear');
  console.log('   2. Manually enable translations if needed (Collection settings)');
  console.log('   3. Run step 2: migrate data from _id/_en fields');
  console.log('   4. Run step 3: cleanup old _id/_en fields');
}

restructureCollection().catch(console.error);
