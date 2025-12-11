/**
 * Directus Collections Setup Script (Using Fetch API)
 *
 * This script automatically creates all collections and fields
 * based on the mock data structure from filosofi-yogya-mod/lib/data/mock/
 *
 * Usage:
 *   node scripts/setup-collections-fetch.js
 */

import 'dotenv/config';

const DIRECTUS_URL = process.env.PUBLIC_URL || 'http://localhost:8055';
let accessToken = null;

// Helper function to make authenticated requests
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

// Login to get access token
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

// Create a collection
async function createCollection(collectionName, meta, schema = {}) {
  try {
    await directusRequest('/collections', {
      method: 'POST',
      body: JSON.stringify({
        collection: collectionName,
        meta,
        schema: { name: collectionName, ...schema },
      }),
    });
    return true;
  } catch (error) {
    if (error.message.includes('already exists')) {
      return false;
    }
    throw error;
  }
}

// Create a field
async function createField(collection, field) {
  try {
    await directusRequest(`/fields/${collection}`, {
      method: 'POST',
      body: JSON.stringify(field),
    });
  } catch (error) {
    if (error.message.includes('already exists')) {
      return;
    }
    throw error;
  }
}

async function setupCollections() {
  try {
    await login();

    // Map Locations Collection
    await createMapLocationsCollection();

    // Agenda Events Collection
    await createAgendaEventsCollection();

    // Destinasi Wisata Collection
    await createDestinasiWisataCollection();

    // Spot Nongkrong Collection
    await createSpotNongkrongCollection();

    // Trending Articles Collection
    await createTrendingArticlesCollection();

    // Encyclopedia Categories Collection
    await createEncyclopediaCategoriesCollection();

    // Encyclopedia Entries Collection
    await createEncyclopediaEntriesCollection();

    // UMKM Lokal Collection
    await createUmkmLokalCollection();

    console.log('\n✅ All collections created successfully!');
    console.log('\n📝 Next Steps:');
    console.log('1. Login to Directus Admin: http://localhost:8055');
    console.log('2. Verify collections in Content Module');
    console.log('3. Import data using the UI guide (see IMPORT_GUIDE.md)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function createMapLocationsCollection() {
  console.log('📍 Creating Map Locations collection...');

  const exists = !await createCollection('map_locations', {
    icon: 'place',
    note: 'Lokasi penting di Sumbu Filosofi Yogyakarta (29 items)',
    display_template: '{{name_id}}',
    sort_field: 'sort',
  });

  if (exists) {
    console.log('⚠️  Map Locations collection already exists, skipping...');
    return;
  }

  const fields = [
    { field: 'id', type: 'string', schema: { is_primary_key: true, has_auto_increment: false }, meta: { interface: 'input', readonly: true } },
    { field: 'name_id', type: 'string', meta: { interface: 'input', required: true } },
    { field: 'name_en', type: 'string', meta: { interface: 'input', required: true } },
    { field: 'description_id', type: 'text', meta: { interface: 'input-multiline' } },
    { field: 'description_en', type: 'text', meta: { interface: 'input-multiline' } },
    { field: 'address_id', type: 'string', meta: { interface: 'input' } },
    { field: 'address_en', type: 'string', meta: { interface: 'input' } },
    { field: 'category', type: 'string', meta: { interface: 'select-dropdown', options: { choices: [
      { text: 'Heritage', value: 'heritage' },
      { text: 'Monument', value: 'monument' },
      { text: 'Culinary', value: 'culinary' },
      { text: 'UMKM', value: 'umkm' },
      { text: 'Museum', value: 'museum' },
      { text: 'Education', value: 'education' },
    ] } } },
    { field: 'latitude', type: 'float', meta: { interface: 'input', required: true } },
    { field: 'longitude', type: 'float', meta: { interface: 'input', required: true } },
    { field: 'image', type: 'string', meta: { interface: 'input' } },
    { field: 'phone', type: 'string', meta: { interface: 'input' } },
    { field: 'website', type: 'string', meta: { interface: 'input' } },
    { field: 'opening_hours_id', type: 'string', meta: { interface: 'input' } },
    { field: 'opening_hours_en', type: 'string', meta: { interface: 'input' } },
    { field: 'ticket_price_id', type: 'string', meta: { interface: 'input' } },
    { field: 'ticket_price_en', type: 'string', meta: { interface: 'input' } },
    { field: 'facilities', type: 'json', meta: { interface: 'list' } },
    { field: 'status', type: 'string', meta: { interface: 'select-dropdown', options: { choices: [
      { text: 'Published', value: 'published' },
      { text: 'Draft', value: 'draft' },
      { text: 'Archived', value: 'archived' },
    ] }, default_value: 'published' } },
    { field: 'sort', type: 'integer', meta: { interface: 'input', hidden: true } },
    { field: 'created_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', readonly: true, special: ['date-created'] } },
    { field: 'updated_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', readonly: true, special: ['date-updated'] } },
  ];

  for (const field of fields) {
    await createField('map_locations', field);
  }

  console.log('✅ Map Locations collection created');
}

async function createAgendaEventsCollection() {
  console.log('📅 Creating Agenda Events collection...');

  const exists = !await createCollection('agenda_events', {
    icon: 'event',
    note: 'Event dan agenda di Yogyakarta',
    display_template: '{{title_id}}',
  });

  if (exists) {
    console.log('⚠️  Agenda Events collection already exists, skipping...');
    return;
  }

  const fields = [
    { field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true } },
    { field: 'slug', type: 'string', meta: { interface: 'input', required: true } },
    { field: 'title_id', type: 'string', meta: { interface: 'input', required: true } },
    { field: 'title_en', type: 'string', meta: { interface: 'input', required: true } },
    { field: 'category_id', type: 'string', meta: { interface: 'input' } },
    { field: 'category_en', type: 'string', meta: { interface: 'input' } },
    { field: 'date_id', type: 'string', meta: { interface: 'input' } },
    { field: 'date_en', type: 'string', meta: { interface: 'input' } },
    { field: 'time_id', type: 'string', meta: { interface: 'input' } },
    { field: 'time_en', type: 'string', meta: { interface: 'input' } },
    { field: 'location_id', type: 'string', meta: { interface: 'input' } },
    { field: 'location_en', type: 'string', meta: { interface: 'input' } },
    { field: 'price_id', type: 'string', meta: { interface: 'input' } },
    { field: 'price_en', type: 'string', meta: { interface: 'input' } },
    { field: 'age_id', type: 'string', meta: { interface: 'input' } },
    { field: 'age_en', type: 'string', meta: { interface: 'input' } },
    { field: 'image', type: 'string', meta: { interface: 'input' } },
    { field: 'gradient', type: 'string', meta: { interface: 'input' } },
    { field: 'bg_color', type: 'string', meta: { interface: 'input' } },
    { field: 'status', type: 'string', meta: { interface: 'select-dropdown', options: { choices: [
      { text: 'Published', value: 'published' },
      { text: 'Draft', value: 'draft' },
      { text: 'Archived', value: 'archived' },
    ] }, default_value: 'published' } },
    { field: 'created_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', readonly: true, special: ['date-created'] } },
    { field: 'updated_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', readonly: true, special: ['date-updated'] } },
  ];

  for (const field of fields) {
    await createField('agenda_events', field);
  }

  console.log('✅ Agenda Events collection created');
}

async function createDestinasiWisataCollection() {
  console.log('🏖️  Creating Destinasi Wisata collection...');

  const exists = !await createCollection('destinasi_wisata', {
    icon: 'landscape',
    note: 'Destinasi wisata di Yogyakarta',
    display_template: '{{name_id}}',
  });

  if (exists) {
    console.log('⚠️  Destinasi Wisata collection already exists, skipping...');
    return;
  }

  const fields = [
    { field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true } },
    { field: 'slug', type: 'string', meta: { interface: 'input', required: true } },
    { field: 'name_id', type: 'string', meta: { interface: 'input', required: true } },
    { field: 'name_en', type: 'string', meta: { interface: 'input', required: true } },
    { field: 'description_id', type: 'text', meta: { interface: 'input-multiline' } },
    { field: 'description_en', type: 'text', meta: { interface: 'input-multiline' } },
    { field: 'category_id', type: 'string', meta: { interface: 'input' } },
    { field: 'category_en', type: 'string', meta: { interface: 'input' } },
    { field: 'location_id', type: 'string', meta: { interface: 'input' } },
    { field: 'location_en', type: 'string', meta: { interface: 'input' } },
    { field: 'rating', type: 'float', meta: { interface: 'input' } },
    { field: 'image', type: 'string', meta: { interface: 'input' } },
    { field: 'latitude', type: 'float', meta: { interface: 'input' } },
    { field: 'longitude', type: 'float', meta: { interface: 'input' } },
    { field: 'status', type: 'string', meta: { interface: 'select-dropdown', options: { choices: [
      { text: 'Published', value: 'published' },
      { text: 'Draft', value: 'draft' },
      { text: 'Archived', value: 'archived' },
    ] }, default_value: 'published' } },
    { field: 'created_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', readonly: true, special: ['date-created'] } },
    { field: 'updated_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', readonly: true, special: ['date-updated'] } },
  ];

  for (const field of fields) {
    await createField('destinasi_wisata', field);
  }

  console.log('✅ Destinasi Wisata collection created');
}

async function createSpotNongkrongCollection() {
  console.log('☕ Creating Spot Nongkrong collection...');

  const exists = !await createCollection('spot_nongkrong', {
    icon: 'coffee',
    note: 'Tempat nongkrong favorit di Yogyakarta',
    display_template: '{{name_id}}',
  });

  if (exists) {
    console.log('⚠️  Spot Nongkrong collection already exists, skipping...');
    return;
  }

  const fields = [
    { field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true } },
    { field: 'slug', type: 'string', meta: { interface: 'input', required: true } },
    { field: 'name_id', type: 'string', meta: { interface: 'input', required: true } },
    { field: 'name_en', type: 'string', meta: { interface: 'input', required: true } },
    { field: 'description_id', type: 'text', meta: { interface: 'input-multiline' } },
    { field: 'description_en', type: 'text', meta: { interface: 'input-multiline' } },
    { field: 'category_id', type: 'string', meta: { interface: 'input' } },
    { field: 'category_en', type: 'string', meta: { interface: 'input' } },
    { field: 'address_id', type: 'string', meta: { interface: 'input' } },
    { field: 'address_en', type: 'string', meta: { interface: 'input' } },
    { field: 'price_range', type: 'string', meta: { interface: 'input' } },
    { field: 'opening_hours', type: 'string', meta: { interface: 'input' } },
    { field: 'image', type: 'string', meta: { interface: 'input' } },
    { field: 'atmosphere', type: 'json', meta: { interface: 'list' } },
    { field: 'latitude', type: 'float', meta: { interface: 'input' } },
    { field: 'longitude', type: 'float', meta: { interface: 'input' } },
    { field: 'status', type: 'string', meta: { interface: 'select-dropdown', options: { choices: [
      { text: 'Published', value: 'published' },
      { text: 'Draft', value: 'draft' },
      { text: 'Archived', value: 'archived' },
    ] }, default_value: 'published' } },
    { field: 'created_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', readonly: true, special: ['date-created'] } },
    { field: 'updated_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', readonly: true, special: ['date-updated'] } },
  ];

  for (const field of fields) {
    await createField('spot_nongkrong', field);
  }

  console.log('✅ Spot Nongkrong collection created');
}

async function createTrendingArticlesCollection() {
  console.log('📰 Creating Trending Articles collection...');

  const exists = !await createCollection('trending_articles', {
    icon: 'trending_up',
    note: 'Artikel trending tentang Yogyakarta',
    display_template: '{{title_id}}',
  });

  if (exists) {
    console.log('⚠️  Trending Articles collection already exists, skipping...');
    return;
  }

  const fields = [
    { field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true } },
    { field: 'slug', type: 'string', meta: { interface: 'input', required: true } },
    { field: 'title_id', type: 'string', meta: { interface: 'input', required: true } },
    { field: 'title_en', type: 'string', meta: { interface: 'input', required: true } },
    { field: 'excerpt_id', type: 'text', meta: { interface: 'input-multiline' } },
    { field: 'excerpt_en', type: 'text', meta: { interface: 'input-multiline' } },
    { field: 'content_id', type: 'text', meta: { interface: 'input-rich-text-html' } },
    { field: 'content_en', type: 'text', meta: { interface: 'input-rich-text-html' } },
    { field: 'category_id', type: 'string', meta: { interface: 'input' } },
    { field: 'category_en', type: 'string', meta: { interface: 'input' } },
    { field: 'author', type: 'string', meta: { interface: 'input' } },
    { field: 'published_date', type: 'date', meta: { interface: 'datetime' } },
    { field: 'image', type: 'string', meta: { interface: 'input' } },
    { field: 'views', type: 'integer', meta: { interface: 'input', default_value: 0 } },
    { field: 'status', type: 'string', meta: { interface: 'select-dropdown', options: { choices: [
      { text: 'Published', value: 'published' },
      { text: 'Draft', value: 'draft' },
      { text: 'Archived', value: 'archived' },
    ] }, default_value: 'published' } },
    { field: 'created_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', readonly: true, special: ['date-created'] } },
    { field: 'updated_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', readonly: true, special: ['date-updated'] } },
  ];

  for (const field of fields) {
    await createField('trending_articles', field);
  }

  console.log('✅ Trending Articles collection created');
}

async function createEncyclopediaCategoriesCollection() {
  console.log('📚 Creating Encyclopedia Categories collection...');

  const exists = !await createCollection('encyclopedia_categories', {
    icon: 'category',
    note: 'Kategori untuk ensiklopedia Sumbu Filosofi',
    display_template: '{{name_id}}',
  });

  if (exists) {
    console.log('⚠️  Encyclopedia Categories collection already exists, skipping...');
    return;
  }

  const fields = [
    { field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true } },
    { field: 'slug', type: 'string', meta: { interface: 'input', required: true } },
    { field: 'name_id', type: 'string', meta: { interface: 'input', required: true } },
    { field: 'name_en', type: 'string', meta: { interface: 'input', required: true } },
    { field: 'description_id', type: 'text', meta: { interface: 'input-multiline' } },
    { field: 'description_en', type: 'text', meta: { interface: 'input-multiline' } },
    { field: 'icon', type: 'string', meta: { interface: 'input' } },
    { field: 'color', type: 'string', meta: { interface: 'input' } },
    { field: 'sort', type: 'integer', meta: { interface: 'input' } },
    { field: 'created_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', readonly: true, special: ['date-created'] } },
    { field: 'updated_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', readonly: true, special: ['date-updated'] } },
  ];

  for (const field of fields) {
    await createField('encyclopedia_categories', field);
  }

  console.log('✅ Encyclopedia Categories collection created');
}

async function createEncyclopediaEntriesCollection() {
  console.log('📖 Creating Encyclopedia Entries collection...');

  const exists = !await createCollection('encyclopedia_entries', {
    icon: 'menu_book',
    note: 'Entries ensiklopedia Sumbu Filosofi',
    display_template: '{{title_id}}',
  });

  if (exists) {
    console.log('⚠️  Encyclopedia Entries collection already exists, skipping...');
    return;
  }

  const fields = [
    { field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true } },
    { field: 'slug', type: 'string', meta: { interface: 'input', required: true } },
    { field: 'title_id', type: 'string', meta: { interface: 'input', required: true } },
    { field: 'title_en', type: 'string', meta: { interface: 'input', required: true } },
    { field: 'summary_id', type: 'text', meta: { interface: 'input-multiline' } },
    { field: 'summary_en', type: 'text', meta: { interface: 'input-multiline' } },
    { field: 'content_id', type: 'text', meta: { interface: 'input-rich-text-html' } },
    { field: 'content_en', type: 'text', meta: { interface: 'input-rich-text-html' } },
    { field: 'category_id', type: 'integer', meta: { interface: 'select-dropdown-m2o', display: 'related-values' } },
    { field: 'image', type: 'string', meta: { interface: 'input' } },
    { field: 'related_locations', type: 'json', meta: { interface: 'list' } },
    { field: 'status', type: 'string', meta: { interface: 'select-dropdown', options: { choices: [
      { text: 'Published', value: 'published' },
      { text: 'Draft', value: 'draft' },
      { text: 'Archived', value: 'archived' },
    ] }, default_value: 'published' } },
    { field: 'created_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', readonly: true, special: ['date-created'] } },
    { field: 'updated_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', readonly: true, special: ['date-updated'] } },
  ];

  for (const field of fields) {
    await createField('encyclopedia_entries', field);
  }

  console.log('✅ Encyclopedia Entries collection created');
}

async function createUmkmLokalCollection() {
  console.log('🏪 Creating UMKM Lokal collection...');

  const exists = !await createCollection('umkm_lokal', {
    icon: 'store',
    note: 'UMKM lokal di sekitar Sumbu Filosofi',
    display_template: '{{name_id}}',
  });

  if (exists) {
    console.log('⚠️  UMKM Lokal collection already exists, skipping...');
    return;
  }

  const fields = [
    { field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true } },
    { field: 'slug', type: 'string', meta: { interface: 'input', required: true } },
    { field: 'name_id', type: 'string', meta: { interface: 'input', required: true } },
    { field: 'name_en', type: 'string', meta: { interface: 'input', required: true } },
    { field: 'description_id', type: 'text', meta: { interface: 'input-multiline' } },
    { field: 'description_en', type: 'text', meta: { interface: 'input-multiline' } },
    { field: 'category_id', type: 'string', meta: { interface: 'input' } },
    { field: 'category_en', type: 'string', meta: { interface: 'input' } },
    { field: 'owner', type: 'string', meta: { interface: 'input' } },
    { field: 'address_id', type: 'string', meta: { interface: 'input' } },
    { field: 'address_en', type: 'string', meta: { interface: 'input' } },
    { field: 'phone', type: 'string', meta: { interface: 'input' } },
    { field: 'price_range', type: 'string', meta: { interface: 'input' } },
    { field: 'opening_hours', type: 'string', meta: { interface: 'input' } },
    { field: 'image', type: 'string', meta: { interface: 'input' } },
    { field: 'products', type: 'json', meta: { interface: 'list' } },
    { field: 'latitude', type: 'float', meta: { interface: 'input' } },
    { field: 'longitude', type: 'float', meta: { interface: 'input' } },
    { field: 'status', type: 'string', meta: { interface: 'select-dropdown', options: { choices: [
      { text: 'Published', value: 'published' },
      { text: 'Draft', value: 'draft' },
      { text: 'Archived', value: 'archived' },
    ] }, default_value: 'published' } },
    { field: 'created_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', readonly: true, special: ['date-created'] } },
    { field: 'updated_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', readonly: true, special: ['date-updated'] } },
  ];

  for (const field of fields) {
    await createField('umkm_lokal', field);
  }

  console.log('✅ UMKM Lokal collection created');
}

// Run the setup
setupCollections();
