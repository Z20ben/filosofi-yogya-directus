/**
 * Migrate to Directus Built-in Content Translations
 *
 * This script configures the proper translations interface for all 7 collections.
 * The translations tables already exist, we just need to configure the interface.
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.PUBLIC_URL || 'http://127.0.0.1:8055';
let accessToken = null;

// Collection configurations with their translatable fields
const COLLECTIONS = {
  map_locations: {
    translatableFields: ['name', 'description', 'address', 'opening_hours', 'ticket_price'],
    idField: 'map_locations_id',
  },
  destinasi_wisata: {
    translatableFields: ['name', 'location', 'description', 'hours'],
    idField: 'destinasi_wisata_id',
  },
  agenda_events: {
    translatableFields: ['title', 'description', 'location'],
    idField: 'agenda_events_id',
  },
  umkm_lokal: {
    translatableFields: ['name', 'description', 'address'],
    idField: 'umkm_lokal_id',
  },
  spot_nongkrong: {
    translatableFields: ['name', 'description', 'address'],
    idField: 'spot_nongkrong_id',
  },
  trending_articles: {
    translatableFields: ['title', 'excerpt', 'content', 'author'],
    idField: 'trending_articles_id',
  },
  encyclopedia_entries: {
    translatableFields: ['title', 'snippet', 'full_content', 'editor'],
    idField: 'encyclopedia_entries_id',
  },
};

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

  return { response, data };
}

async function getFieldMeta(collection, field) {
  const { response, data } = await directusRequest(`/fields/${collection}/${field}`);
  if (response.ok) {
    return data.data;
  }
  return null;
}

async function deleteField(collection, field) {
  const { response } = await directusRequest(`/fields/${collection}/${field}`, {
    method: 'DELETE',
  });
  return response.ok;
}

async function createTranslationsField(collection, config) {
  const translationsCollection = `${collection}_translations`;

  // The translations interface configuration
  const fieldConfig = {
    field: 'translations',
    type: 'alias',
    meta: {
      interface: 'translations',
      special: ['translations'],
      options: {
        languageField: 'languages_code',
        defaultLanguage: 'id-ID',
        userLanguage: true,
      },
      translations: [
        { language: 'id-ID', translation: 'Terjemahan' },
        { language: 'en-US', translation: 'Translations' },
      ],
    },
    schema: null,
  };

  const { response, data } = await directusRequest(`/fields/${collection}`, {
    method: 'POST',
    body: JSON.stringify(fieldConfig),
  });

  return { success: response.ok, data };
}

async function createRelation(collection, config) {
  const translationsCollection = `${collection}_translations`;

  // Create the O2M relation from main collection to translations
  const relationConfig = {
    collection: translationsCollection,
    field: config.idField,
    related_collection: collection,
    meta: {
      one_field: 'translations',
      sort_field: null,
      one_deselect_action: 'nullify',
    },
    schema: {
      on_delete: 'CASCADE',
    },
  };

  const { response, data } = await directusRequest('/relations', {
    method: 'POST',
    body: JSON.stringify(relationConfig),
  });

  return { success: response.ok, data };
}

async function updateExistingRelation(collection, config) {
  const translationsCollection = `${collection}_translations`;

  // Update existing relation to use translations interface
  const { response, data } = await directusRequest(`/relations/${translationsCollection}/${config.idField}`, {
    method: 'PATCH',
    body: JSON.stringify({
      meta: {
        one_field: 'translations',
        sort_field: null,
        one_deselect_action: 'nullify',
      },
    }),
  });

  return { success: response.ok, data };
}

async function updateFieldInterface(collection, field, newInterface, newSpecial, newOptions = {}) {
  const { response, data } = await directusRequest(`/fields/${collection}/${field}`, {
    method: 'PATCH',
    body: JSON.stringify({
      meta: {
        interface: newInterface,
        special: newSpecial,
        options: newOptions,
      },
    }),
  });

  return { success: response.ok, data };
}

async function setupCollection(collection, config) {
  console.log(`\n📦 ${collection.toUpperCase()}`);
  console.log('-'.repeat(50));

  // Check if translations field exists
  const existingField = await getFieldMeta(collection, 'translations');

  if (existingField) {
    const currentInterface = existingField.meta?.interface;
    console.log(`   Existing translations field: interface=${currentInterface}`);

    if (currentInterface === 'translations') {
      console.log('   ✅ Already using translations interface');
      return { collection, status: 'already_configured' };
    }

    // Need to update the interface
    console.log('   🔄 Updating to translations interface...');

    // First, update the field interface
    const updateResult = await updateFieldInterface(
      collection,
      'translations',
      'translations',
      ['translations'],
      {
        languageField: 'languages_code',
        defaultLanguage: 'id-ID',
        userLanguage: true,
      }
    );

    if (updateResult.success) {
      console.log('   ✅ Field interface updated');
    } else {
      console.log('   ⚠️ Could not update field:', JSON.stringify(updateResult.data));

      // Try delete and recreate
      console.log('   🔄 Trying delete and recreate...');
      await deleteField(collection, 'translations');

      const createResult = await createTranslationsField(collection, config);
      if (createResult.success) {
        console.log('   ✅ Field recreated with translations interface');
      } else {
        console.log('   ❌ Failed to recreate:', JSON.stringify(createResult.data));
        return { collection, status: 'failed', error: createResult.data };
      }
    }

    // Update the relation
    const relationResult = await updateExistingRelation(collection, config);
    if (relationResult.success) {
      console.log('   ✅ Relation updated');
    } else {
      console.log('   ⚠️ Relation update:', JSON.stringify(relationResult.data));
    }

    return { collection, status: 'updated' };

  } else {
    // No translations field exists, create it
    console.log('   Creating translations field...');

    const createResult = await createTranslationsField(collection, config);
    if (createResult.success) {
      console.log('   ✅ Translations field created');
    } else {
      console.log('   ⚠️ Field creation:', JSON.stringify(createResult.data));
    }

    // Create or update the relation
    const relationResult = await createRelation(collection, config);
    if (relationResult.success) {
      console.log('   ✅ Relation created');
    } else {
      // Maybe relation already exists, try to update
      const updateRelation = await updateExistingRelation(collection, config);
      if (updateRelation.success) {
        console.log('   ✅ Existing relation updated');
      } else {
        console.log('   ⚠️ Relation:', JSON.stringify(relationResult.data));
      }
    }

    return { collection, status: 'created' };
  }
}

async function verifySetup() {
  console.log('\n\n' + '='.repeat(60));
  console.log('🔍 VERIFICATION');
  console.log('='.repeat(60));

  for (const collection of Object.keys(COLLECTIONS)) {
    const field = await getFieldMeta(collection, 'translations');
    const iface = field?.meta?.interface || 'none';
    const special = field?.meta?.special || [];

    const status = iface === 'translations' && special.includes('translations')
      ? '✅'
      : '❌';

    console.log(`${status} ${collection}: interface=${iface}, special=${JSON.stringify(special)}`);
  }
}

async function main() {
  console.log('🌍 MIGRATE TO DIRECTUS CONTENT TRANSLATIONS');
  console.log('='.repeat(60));
  console.log('This will configure the built-in translations interface');
  console.log('for all 7 collections.\n');

  await login();

  // Verify languages exist
  console.log('📋 Checking languages...');
  const { data: langsData } = await directusRequest('/items/directus_languages');
  const languages = langsData.data || [];

  if (languages.length === 0) {
    console.log('❌ No languages found! Creating...');
    await directusRequest('/items/directus_languages', {
      method: 'POST',
      body: JSON.stringify([
        { code: 'id-ID', name: 'Indonesian', direction: 'ltr' },
        { code: 'en-US', name: 'English', direction: 'ltr' },
      ]),
    });
    console.log('✅ Languages created\n');
  } else {
    console.log('✅ Languages found:', languages.map(l => l.code).join(', '), '\n');
  }

  // Setup each collection
  const results = [];
  for (const [collection, config] of Object.entries(COLLECTIONS)) {
    const result = await setupCollection(collection, config);
    results.push(result);
  }

  // Verify
  await verifySetup();

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));

  const created = results.filter(r => r.status === 'created').length;
  const updated = results.filter(r => r.status === 'updated').length;
  const configured = results.filter(r => r.status === 'already_configured').length;
  const failed = results.filter(r => r.status === 'failed').length;

  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Already configured: ${configured}`);
  console.log(`   Failed: ${failed}`);

  console.log('\n📋 NEXT STEPS:');
  console.log('   1. Restart Directus to apply changes');
  console.log('   2. Clear browser cache and refresh Directus UI');
  console.log('   3. Check each collection - should show translations tab');
  console.log('   4. Test creating/editing content with translations');

  if (failed > 0) {
    console.log('\n⚠️ Some collections failed. Manual setup may be required.');
    console.log('   Go to Settings → Data Model → [collection] → Add field');
    console.log('   Choose "Translations" interface');
  }
}

main().catch(console.error);
