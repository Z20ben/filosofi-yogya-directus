/**
 * Fix Translations Interface
 *
 * Simple script to update the translations field interface only.
 * Does NOT touch relations (they already exist).
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = 'http://127.0.0.1:8055';
let accessToken = null;

const COLLECTIONS = [
  'map_locations',
  'destinasi_wisata',
  'agenda_events',
  'umkm_lokal',
  'spot_nongkrong',
  'trending_articles',
  'encyclopedia_entries',
];

async function login() {
  const response = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    }),
  });
  const data = await response.json();
  accessToken = data.data.access_token;
  console.log('✅ Logged in\n');
}

async function getField(collection, field) {
  const response = await fetch(`${DIRECTUS_URL}/fields/${collection}/${field}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.ok) {
    const data = await response.json();
    return data.data;
  }
  return null;
}

async function updateFieldMeta(collection, field, meta) {
  const response = await fetch(`${DIRECTUS_URL}/fields/${collection}/${field}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ meta }),
  });
  return response.ok;
}

async function createField(collection, fieldData) {
  const response = await fetch(`${DIRECTUS_URL}/fields/${collection}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(fieldData),
  });
  const data = await response.json();
  return { ok: response.ok, data };
}

async function main() {
  console.log('🔧 FIX TRANSLATIONS INTERFACE\n');
  await login();

  for (const collection of COLLECTIONS) {
    console.log(`📦 ${collection}`);

    const field = await getField(collection, 'translations');

    if (field) {
      const currentInterface = field.meta?.interface;
      console.log(`   Current: ${currentInterface}`);

      if (currentInterface === 'translations') {
        console.log('   ✅ Already correct\n');
        continue;
      }

      // Update to translations interface
      const success = await updateFieldMeta(collection, 'translations', {
        interface: 'translations',
        special: ['translations'],
        options: {
          languageField: 'languages_code',
          defaultLanguage: 'id-ID',
        },
      });

      console.log(success ? '   ✅ Updated\n' : '   ❌ Failed to update\n');
    } else {
      console.log('   No translations field found, creating...');

      // Create translations field as alias with translations interface
      const result = await createField(collection, {
        field: 'translations',
        type: 'alias',
        schema: null,
        meta: {
          interface: 'translations',
          special: ['translations'],
          options: {
            languageField: 'languages_code',
            defaultLanguage: 'id-ID',
          },
        },
      });

      console.log(result.ok ? '   ✅ Created\n' : `   ❌ Failed: ${JSON.stringify(result.data)}\n`);
    }
  }

  // Verify
  console.log('='.repeat(50));
  console.log('VERIFICATION:\n');

  for (const collection of COLLECTIONS) {
    const field = await getField(collection, 'translations');
    const iface = field?.meta?.interface || 'none';
    const status = iface === 'translations' ? '✅' : '❌';
    console.log(`${status} ${collection}: ${iface}`);
  }

  console.log('\n📋 Next: Restart Directus and refresh browser');
}

main().catch(console.error);
