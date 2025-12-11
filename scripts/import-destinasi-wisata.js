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

async function importDestinasiWisata() {
  console.log('📥 Importing Destinasi Wisata...\n');

  await login();

  // Step 1: Load TypeScript data
  console.log('1️⃣ Loading data from TypeScript file...');

  const tsFilePath = 'D:\\Dev\\next-budaya\\filosofi-yogya-mod\\lib\\data\\mock\\destinasi-wisata.data.ts';
  const tsContent = readFileSync(tsFilePath, 'utf-8');

  // Extract array
  const arrayMatch = tsContent.match(/export const destinasiWisata[^=]*=\s*\[([\s\S]*)\];/);
  if (!arrayMatch) {
    throw new Error('Could not extract destinasiWisata array');
  }

  let destinasiWisata;
  eval('destinasiWisata = [' + arrayMatch[1] + '];');
  console.log(`✅ Loaded ${destinasiWisata.length} destinations\n`);

  // Step 2: Get existing map_locations for matching
  console.log('2️⃣ Fetching existing map_locations...');

  const mapLocations = await directusRequest('/items/map_locations?fields=id&limit=-1');
  const mapLocationIds = mapLocations.data.map(loc => loc.id);
  console.log(`✅ Found ${mapLocationIds.length} map locations\n`);

  // Step 3: Import each destination
  console.log('3️⃣ Importing destinations...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const item of destinasiWisata) {
    try {
      console.log(`   📍 Importing: ${item.slug}...`);

      // Try to match with map_location by slug
      const mapLocationId = mapLocationIds.includes(item.slug) ? item.slug : null;

      if (mapLocationId) {
        console.log(`      🔗 Matched with map_location: ${mapLocationId}`);
      }

      // Create main record (Indonesian as default)
      const mainData = {
        slug: item.slug,
        name: item.name_id,
        location: item.location_id,
        description: item.description_id,
        hours: item.hours_id,
        map_location_id: mapLocationId,
        image: null, // TODO: Handle image import
        latitude: item.latitude || null,
        longitude: item.longitude || null,
        status: item.status || 'published'
      };

      const createResult = await directusRequest('/items/destinasi_wisata', {
        method: 'POST',
        body: JSON.stringify(mainData)
      });

      const createdId = createResult.data.id;
      console.log(`      ✅ Main record created (ID: ${createdId})`);

      // Create English translation
      const translationData = {
        destinasi_wisata_id: createdId,
        languages_code: 'en-US',
        name: item.name_en,
        location: item.location_en,
        description: item.description_en,
        hours: item.hours_en
      };

      await directusRequest('/items/destinasi_wisata_translations', {
        method: 'POST',
        body: JSON.stringify(translationData)
      });

      console.log(`      ✅ English translation created`);
      successCount++;

    } catch (error) {
      console.log(`      ❌ Error: ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n📊 Import Summary:');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📋 Total: ${destinasiWisata.length}`);

  if (successCount > 0) {
    console.log('\n✅ Import complete!');
    console.log('\n📋 Test with:');
    console.log('   GET /items/destinasi_wisata?fields=*,translations.*&deep[translations][_filter][languages_code][_eq]=en-US');
  }
}

importDestinasiWisata().catch(console.error);
