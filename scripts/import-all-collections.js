import fetch from 'node-fetch';
import { readFileSync } from 'fs';
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

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(error)}`);
  }

  return response.json();
}

function loadTsData(filePath, varName) {
  const tsContent = readFileSync(filePath, 'utf-8');
  const arrayMatch = tsContent.match(new RegExp(`export const ${varName}[^=]*=\\s*\\[([\\s\\S]*)\\];`));

  if (!arrayMatch) {
    throw new Error(`Could not extract ${varName} array from ${filePath}`);
  }

  let data;
  eval(`data = [${arrayMatch[1]}];`);
  return data;
}

async function importCollection(config) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📦 Importing ${config.name}...\n`);

  const data = loadTsData(config.filePath, config.varName);
  console.log(`✅ Loaded ${data.length} items\n`);

  // Get map_locations for matching
  const mapLocations = await directusRequest('/items/map_locations?fields=id&limit=-1');
  const mapLocationIds = mapLocations.data.map(loc => loc.id);

  let successCount = 0;
  let errorCount = 0;

  for (const item of data) {
    try {
      console.log(`   📍 ${item.slug}...`);

      // Try to match with map_location
      const mapLocationId = mapLocationIds.includes(item.slug) ? item.slug : null;

      // Transform data using config function
      const { mainData, translationData } = config.transform(item, mapLocationId);

      // Create main record
      const createResult = await directusRequest(`/items/${config.collection}`, {
        method: 'POST',
        body: JSON.stringify(mainData)
      });

      const createdId = createResult.data.id;

      // Create translation
      const transData = {
        ...translationData,
        [`${config.collection}_id`]: createdId,
        languages_code: 'en-US'
      };

      await directusRequest(`/items/${config.collection}_translations`, {
        method: 'POST',
        body: JSON.stringify(transData)
      });

      console.log(`      ✅ Imported (ID: ${createdId})`);
      successCount++;

    } catch (error) {
      console.log(`      ❌ Error: ${error.message.substring(0, 100)}`);
      errorCount++;
    }
  }

  console.log(`\n   📊 ${config.name}: ${successCount}/${data.length} imported`);
  return { success: successCount, error: errorCount };
}

async function importAll() {
  console.log('📥 IMPORTING ALL COLLECTIONS\n');

  await login();

  const collections = [
    // Already done: destinasi_wisata (5 items)

    // Agenda Events
    {
      name: 'Agenda Events',
      collection: 'agenda_events',
      filePath: 'D:\\Dev\\next-budaya\\filosofi-yogya-mod\\lib\\data\\mock\\agenda-event.data.ts',
      varName: 'agendaEvents',
      transform: (item, mapLocationId) => ({
        mainData: {
          slug: item.slug,
          title: item.title_id,
          description: item.description_id,
          location: item.location_id,
          organizer: item.organizer_id,
          event_date: item.date,
          start_time: item.startTime,
          end_time: item.endTime,
          map_location_id: mapLocationId,
          latitude: item.latitude || null,
          longitude: item.longitude || null,
          ticket_price: item.ticketPrice || null,
          tags: item.tags || null,
          status: 'published'
        },
        translationData: {
          title: item.title_en,
          description: item.description_en,
          location: item.location_en,
          organizer: item.organizer_en
        }
      })
    },

    // UMKM Lokal
    {
      name: 'UMKM Lokal',
      collection: 'umkm_lokal',
      filePath: 'D:\\Dev\\next-budaya\\filosofi-yogya-mod\\lib\\data\\mock\\umkm-lokal.data.ts',
      varName: 'umkmLokal',
      transform: (item, mapLocationId) => ({
        mainData: {
          slug: item.slug,
          name: item.name_id,
          description: item.description_id,
          address: item.address_id,
          category: item.category_id,
          map_location_id: mapLocationId,
          latitude: item.latitude || null,
          longitude: item.longitude || null,
          phone: item.phone || null,
          whatsapp: item.whatsapp || null,
          instagram: item.instagram || null,
          facebook: item.facebook || null,
          website: item.website || null,
          opening_hours: item.openingHours || null,
          price_range: item.priceRange || null,
          tags: item.tags || null,
          status: 'published'
        },
        translationData: {
          name: item.name_en,
          description: item.description_en,
          address: item.address_en,
          category: item.category_en
        }
      })
    },

    // Spot Nongkrong
    {
      name: 'Spot Nongkrong',
      collection: 'spot_nongkrong',
      filePath: 'D:\\Dev\\next-budaya\\filosofi-yogya-mod\\lib\\data\\mock\\spot-nongkrong.data.ts',
      varName: 'spotNongkrong',
      transform: (item, mapLocationId) => ({
        mainData: {
          slug: item.slug,
          name: item.name_id,
          description: item.description_id,
          address: item.address_id,
          map_location_id: mapLocationId,
          latitude: item.latitude || null,
          longitude: item.longitude || null,
          category: item.category || null,
          opening_hours: item.openingHours || null,
          price_range: item.priceRange || null,
          facilities: item.facilities || null,
          tags: item.tags || null,
          badges: item.badges || null,
          phone: item.phone || null,
          instagram: item.instagram || null,
          status: 'published'
        },
        translationData: {
          name: item.name_en,
          description: item.description_en,
          address: item.address_en
        }
      })
    },

    // Trending Articles
    {
      name: 'Trending Articles',
      collection: 'trending_articles',
      filePath: 'D:\\Dev\\next-budaya\\filosofi-yogya-mod\\lib\\data\\mock\\trending.data.ts',
      varName: 'trendingArticles',
      transform: (item, mapLocationId) => ({
        mainData: {
          slug: item.slug,
          title: item.title_id,
          excerpt: item.excerpt_id,
          content: item.content_id,
          author: item.author_id,
          category: item.category || null,
          tags: item.tags || null,
          views: item.views || 0,
          published_date: item.publishedDate || new Date().toISOString().split('T')[0],
          status: 'published'
        },
        translationData: {
          title: item.title_en,
          excerpt: item.excerpt_en,
          content: item.content_en,
          author: item.author_en
        }
      })
    },

    // Encyclopedia Entries
    {
      name: 'Encyclopedia Entries',
      collection: 'encyclopedia_entries',
      filePath: 'D:\\Dev\\next-budaya\\filosofi-yogya-mod\\lib\\data\\mock\\encyclopedia.data.ts',
      varName: 'encyclopediaEntries',
      transform: (item, mapLocationId) => ({
        mainData: {
          slug: item.slug,
          title: item.title_id,
          content: item.content_id,
          summary: item.summary_id,
          category_id: item.categoryId || null,
          tags: item.tags || null,
          status: 'published'
        },
        translationData: {
          title: item.title_en,
          content: item.content_en,
          summary: item.summary_en
        }
      })
    }
  ];

  const results = [];
  for (const config of collections) {
    try {
      const result = await importCollection(config);
      results.push({ name: config.name, ...result });
    } catch (error) {
      console.error(`\n❌ ${config.name} failed:`, error.message);
      results.push({ name: config.name, success: 0, error: 'Failed' });
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 IMPORT SUMMARY\n');

  let totalSuccess = 0;
  let totalError = 0;

  results.forEach(r => {
    console.log(`   ${r.name}: ✅ ${r.success} | ❌ ${r.error || 0}`);
    totalSuccess += r.success || 0;
    totalError += (typeof r.error === 'number' ? r.error : 0);
  });

  console.log(`\n   TOTAL: ✅ ${totalSuccess} | ❌ ${totalError}`);
  console.log('\n✅ All imports complete!');
}

importAll().catch(console.error);
