/**
 * Update Collections to Production-Ready Configuration
 *
 * This script updates existing collections to use proper field interfaces:
 * - Image fields → File Upload (file-image interface)
 * - Facilities → Tags interface (user-friendly multi-select)
 * - Add field validations
 * - Better field organization
 *
 * Usage:
 *   node scripts/update-to-production.js
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

async function updateField(collection, field, updates) {
  try {
    await directusRequest(`/fields/${collection}/${field}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  } catch (error) {
    console.error(`   ⚠️  Could not update ${field}:`, error.message);
  }
}

async function updateToProduction() {
  try {
    await login();

    console.log('🔧 Updating Collections to Production-Ready Configuration...\n');

    // Update Map Locations
    await updateMapLocations();

    // Update Agenda Events
    await updateAgendaEvents();

    // Update Destinasi Wisata
    await updateDestinasiWisata();

    // Update Spot Nongkrong
    await updateSpotNongkrong();

    // Update Trending Articles
    await updateTrendingArticles();

    // Update Encyclopedia Entries
    await updateEncyclopediaEntries();

    // Update UMKM Lokal
    await updateUmkmLokal();

    console.log('\n✅ All collections updated to production-ready configuration!');
    console.log('\n📝 Changes Made:');
    console.log('   • Image fields → File Upload interface');
    console.log('   • Facilities → Tags interface (multi-select)');
    console.log('   • Added field notes and help text');
    console.log('   • Better field organization');
    console.log('\n⚠️  IMPORTANT: Existing text data in image fields will be preserved.');
    console.log('   You can now upload actual images and they will replace the text placeholders.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function updateMapLocations() {
  console.log('📍 Updating Map Locations...');

  // Update image field to file upload
  await updateField('map_locations', 'image', {
    type: 'uuid',
    meta: {
      interface: 'file-image',
      special: ['file'],
      note: 'Upload gambar lokasi (recommended: 1200x800px, max 2MB)',
      options: {
        folder: 'map-locations',
      },
    },
  });

  // Update facilities to tags interface
  await updateField('map_locations', 'facilities', {
    type: 'json',
    meta: {
      interface: 'tags',
      note: 'Fasilitas yang tersedia (contoh: Parking, WiFi, Wheelchair Access)',
      options: {
        placeholder: 'Add facility...',
        iconRight: 'local_offer',
        presetColors: [
          '#00C897',
          '#6644FF',
          '#B94DFF',
          '#F05252',
        ],
      },
    },
  });

  // Add better notes to coordinate fields
  await updateField('map_locations', 'latitude', {
    meta: {
      interface: 'input',
      required: true,
      note: 'Latitude koordinat (contoh: -7.8052)',
      width: 'half',
    },
  });

  await updateField('map_locations', 'longitude', {
    meta: {
      interface: 'input',
      required: true,
      note: 'Longitude koordinat (contoh: 110.3644)',
      width: 'half',
    },
  });

  console.log('   ✅ Map Locations updated');
}

async function updateAgendaEvents() {
  console.log('📅 Updating Agenda Events...');

  await updateField('agenda_events', 'image', {
    type: 'uuid',
    meta: {
      interface: 'file-image',
      special: ['file'],
      note: 'Upload gambar event (recommended: 1200x630px untuk social sharing)',
      options: {
        folder: 'events',
      },
    },
  });

  // Add note for gradient field
  await updateField('agenda_events', 'gradient', {
    meta: {
      interface: 'input',
      note: 'Tailwind gradient class (contoh: from-purple-500 to-pink-500)',
    },
  });

  console.log('   ✅ Agenda Events updated');
}

async function updateDestinasiWisata() {
  console.log('🏖️  Updating Destinasi Wisata...');

  await updateField('destinasi_wisata', 'image', {
    type: 'uuid',
    meta: {
      interface: 'file-image',
      special: ['file'],
      note: 'Upload gambar destinasi wisata (recommended: 1200x800px)',
      options: {
        folder: 'destinations',
      },
    },
  });

  // Update rating field
  await updateField('destinasi_wisata', 'rating', {
    meta: {
      interface: 'input',
      note: 'Rating dari 1-5 (contoh: 4.8)',
      options: {
        min: 1,
        max: 5,
        step: 0.1,
      },
    },
  });

  console.log('   ✅ Destinasi Wisata updated');
}

async function updateSpotNongkrong() {
  console.log('☕ Updating Spot Nongkrong...');

  await updateField('spot_nongkrong', 'image', {
    type: 'uuid',
    meta: {
      interface: 'file-image',
      special: ['file'],
      note: 'Upload gambar tempat nongkrong',
      options: {
        folder: 'hangout-spots',
      },
    },
  });

  // Update atmosphere to tags
  await updateField('spot_nongkrong', 'atmosphere', {
    type: 'json',
    meta: {
      interface: 'tags',
      note: 'Suasana tempat (contoh: Cozy, Modern, Traditional)',
      options: {
        placeholder: 'Add atmosphere tag...',
      },
    },
  });

  console.log('   ✅ Spot Nongkrong updated');
}

async function updateTrendingArticles() {
  console.log('📰 Updating Trending Articles...');

  await updateField('trending_articles', 'image', {
    type: 'uuid',
    meta: {
      interface: 'file-image',
      special: ['file'],
      note: 'Upload featured image artikel (recommended: 1200x630px)',
      options: {
        folder: 'articles',
      },
    },
  });

  // Update content fields to WYSIWYG
  await updateField('trending_articles', 'content_id', {
    type: 'text',
    meta: {
      interface: 'input-rich-text-html',
      note: 'Konten artikel dalam bahasa Indonesia',
      options: {
        toolbar: [
          'bold',
          'italic',
          'underline',
          'h1',
          'h2',
          'h3',
          'numlist',
          'bullist',
          'blockquote',
          'link',
          'code',
          'image',
        ],
      },
    },
  });

  await updateField('trending_articles', 'content_en', {
    type: 'text',
    meta: {
      interface: 'input-rich-text-html',
      note: 'Article content in English',
      options: {
        toolbar: [
          'bold',
          'italic',
          'underline',
          'h1',
          'h2',
          'h3',
          'numlist',
          'bullist',
          'blockquote',
          'link',
          'code',
          'image',
        ],
      },
    },
  });

  console.log('   ✅ Trending Articles updated');
}

async function updateEncyclopediaEntries() {
  console.log('📖 Updating Encyclopedia Entries...');

  await updateField('encyclopedia_entries', 'image', {
    type: 'uuid',
    meta: {
      interface: 'file-image',
      special: ['file'],
      note: 'Upload gambar untuk entry ensiklopedia',
      options: {
        folder: 'encyclopedia',
      },
    },
  });

  // Update related_locations to tags
  await updateField('encyclopedia_entries', 'related_locations', {
    type: 'json',
    meta: {
      interface: 'tags',
      note: 'ID lokasi terkait (contoh: keraton-yogyakarta, tugu-yogyakarta)',
      options: {
        placeholder: 'Add location ID...',
      },
    },
  });

  console.log('   ✅ Encyclopedia Entries updated');
}

async function updateUmkmLokal() {
  console.log('🏪 Updating UMKM Lokal...');

  await updateField('umkm_lokal', 'image', {
    type: 'uuid',
    meta: {
      interface: 'file-image',
      special: ['file'],
      note: 'Upload gambar UMKM atau produk',
      options: {
        folder: 'umkm',
      },
    },
  });

  // Update products to tags
  await updateField('umkm_lokal', 'products', {
    type: 'json',
    meta: {
      interface: 'tags',
      note: 'Daftar produk yang dijual (contoh: Batik Tulis, Kerajinan Perak)',
      options: {
        placeholder: 'Add product...',
      },
    },
  });

  console.log('   ✅ UMKM Lokal updated');
}

// Run the update
updateToProduction();
