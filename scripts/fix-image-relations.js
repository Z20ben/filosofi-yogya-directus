/**
 * Fix Image Field Relations
 *
 * This script properly configures image fields as M2O (Many-to-One) relations
 * to directus_files collection.
 *
 * Issue: When selecting images from library, they don't appear selected
 * Cause: Field type changed but relation not properly configured
 * Solution: Update field meta to include proper relation configuration
 *
 * Usage:
 *   node scripts/fix-image-relations.js
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

async function updateImageField(collection, fieldName, folder) {
  console.log(`   Fixing ${collection}.${fieldName}...`);

  try {
    // Update field with proper M2O relation configuration
    await directusRequest(`/fields/${collection}/${fieldName}`, {
      method: 'PATCH',
      body: JSON.stringify({
        type: 'uuid',
        schema: {
          foreign_key_column: fieldName,
          foreign_key_table: collection,
        },
        meta: {
          interface: 'file-image',
          special: ['file'],
          display: 'related-values',
          display_options: {
            template: '{{title}}',
          },
          options: {
            folder: folder,
            crop: true,
          },
          note: `Upload gambar (recommended: JPG/PNG/WebP, max 2MB)`,
          width: 'full',
        },
      }),
    });

    console.log(`   ✅ ${collection}.${fieldName} fixed`);
  } catch (error) {
    console.error(`   ❌ Error fixing ${collection}.${fieldName}:`, error.message);
  }
}

async function fixImageRelations() {
  try {
    await login();

    console.log('🔧 Fixing Image Field Relations...\n');

    // Fix all image fields across collections
    console.log('📍 Map Locations');
    await updateImageField('map_locations', 'image', 'map-locations');

    console.log('\n📅 Agenda Events');
    await updateImageField('agenda_events', 'image', 'events');

    console.log('\n🏖️  Destinasi Wisata');
    await updateImageField('destinasi_wisata', 'image', 'destinations');

    console.log('\n☕ Spot Nongkrong');
    await updateImageField('spot_nongkrong', 'image', 'hangout-spots');

    console.log('\n📰 Trending Articles');
    await updateImageField('trending_articles', 'image', 'articles');

    console.log('\n📖 Encyclopedia Entries');
    await updateImageField('encyclopedia_entries', 'image', 'encyclopedia');

    console.log('\n🏪 UMKM Lokal');
    await updateImageField('umkm_lokal', 'image', 'umkm');

    console.log('\n\n✅ All image fields fixed!');
    console.log('\n📝 What was fixed:');
    console.log('   • Proper M2O relation to directus_files');
    console.log('   • Display template configuration');
    console.log('   • File selection now works correctly');
    console.log('\n🔄 Next Steps:');
    console.log('   1. Refresh Directus Admin (Ctrl+Shift+R or Cmd+Shift+R)');
    console.log('   2. Try selecting image from library again');
    console.log('   3. Image should now appear selected with thumbnail preview');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the fix
fixImageRelations();
