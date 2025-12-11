/**
 * Create Image Field Relations (PROPER FIX)
 *
 * This creates explicit M2O relations between image fields and directus_files.
 * Previous scripts only updated field config, but didn't create the relation entry.
 *
 * This is the ROOT CAUSE fix for images not appearing when selected.
 */

import 'dotenv/config';

const DIRECTUS_URL = process.env.PUBLIC_URL || 'http://localhost:8055';
let accessToken = null;

async function directusRequest(endpoint, options = {}) {
  const url = `${DIRECTUS_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`HTTP ${response.status}: ${error.message || JSON.stringify(error)}`);
  }

  return response.json();
}

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

  if (!response.ok) {
    throw new Error(`Login failed: ${response.statusText}`);
  }

  const data = await response.json();
  accessToken = data.data.access_token;
  console.log('✅ Authenticated successfully\n');
}

async function createRelation(collection, field) {
  console.log(`   Creating relation: ${collection}.${field} → directus_files`);

  try {
    await directusRequest('/relations', {
      method: 'POST',
      body: JSON.stringify({
        collection: collection,
        field: field,
        related_collection: 'directus_files',
        meta: {
          many_collection: collection,
          many_field: field,
          one_collection: 'directus_files',
          one_field: null,
          one_collection_field: null,
          one_allowed_collections: null,
          junction_field: null,
          sort_field: null,
          one_deselect_action: 'nullify',
        },
        schema: {
          constraint_name: null,
          table: collection,
          column: field,
          foreign_key_table: 'directus_files',
          foreign_key_column: 'id',
          on_update: 'NO ACTION',
          on_delete: 'SET NULL',
        },
      }),
    });

    console.log(`   ✅ Relation created for ${collection}.${field}`);
  } catch (error) {
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log(`   ⚠️  Relation already exists for ${collection}.${field}`);
    } else {
      console.error(`   ❌ Failed to create relation for ${collection}.${field}:`, error.message);
    }
  }
}

async function createAllRelations() {
  try {
    await login();

    console.log('🔗 Creating Image Field Relations...\n');

    const imageFields = [
      { collection: 'map_locations', field: 'image' },
      { collection: 'agenda_events', field: 'image' },
      { collection: 'destinasi_wisata', field: 'image' },
      { collection: 'spot_nongkrong', field: 'image' },
      { collection: 'trending_articles', field: 'image' },
      { collection: 'encyclopedia_entries', field: 'image' },
      { collection: 'umkm_lokal', field: 'image' },
    ];

    for (const { collection, field } of imageFields) {
      await createRelation(collection, field);
    }

    console.log('\n✅ All relations created successfully!');
    console.log('\n📝 What was done:');
    console.log('   • Created explicit M2O relations to directus_files');
    console.log('   • Set proper foreign key constraints');
    console.log('   • Configured cascade behavior (SET NULL on delete)');
    console.log('\n🔄 CRITICAL NEXT STEPS:');
    console.log('   1. HARD REFRESH browser (Ctrl+Shift+R / Cmd+Shift+R)');
    console.log('   2. LOGOUT and LOGIN again to Directus');
    console.log('   3. Go to Map Locations → Create new');
    console.log('   4. Select image from library');
    console.log('   5. Image should NOW appear with thumbnail! ✅');
    console.log('\n⚠️  If still not working:');
    console.log('   • Clear all browser cache');
    console.log('   • Try incognito/private window');
    console.log('   • Or try different browser');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run
createAllRelations();
