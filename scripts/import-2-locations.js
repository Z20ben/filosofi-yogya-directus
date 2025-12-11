/**
 * Import 2 Specific Locations
 * - panggung-krapyak
 * - monumen-jogja-kembali
 */

import 'dotenv/config';

const DIRECTUS_URL = process.env.PUBLIC_URL || 'http://localhost:8055';
let accessToken = null;

const locationsToImport = [
  {
    id: 'panggung-krapyak',
    name_id: 'Panggung Krapyak',
    name_en: 'Panggung Krapyak',
    description_id: 'Bangunan bersejarah di ujung selatan Sumbu Filosofi.',
    description_en: 'A historical building at the southern end of the Philosophical Axis.',
    category: 'monument',
    latitude: -7.827522,
    longitude: 110.3605941,
    address_id: 'Panggungharjo, Sewon, Bantul',
    address_en: 'Panggungharjo, Sewon, Bantul',
    google_maps_url: 'https://goo.gl/maps/krapyak',
    status: 'published',
  },
  {
    id: 'monumen-jogja-kembali',
    name_id: 'Monumen Jogja Kembali (Monjali)',
    name_en: 'Yogyakarta Kembali Monument',
    description_id: 'Museum dan monumen peringatan perjuangan kemerdekaan Indonesia di Yogyakarta.',
    description_en: 'Museum and memorial monument commemorating the Indonesian independence struggle in Yogyakarta.',
    category: 'monument',
    latitude: -7.74931,
    longitude: 110.36968,
    address_id: 'Jl. Ring Road Utara, Jongkang, Sariharjo, Ngaglik, Sleman',
    address_en: 'Jl. Ring Road Utara, Jongkang, Sariharjo, Ngaglik, Sleman',
    opening_hours_id: '08:00 - 16:00',
    opening_hours_en: '08:00 AM - 4:00 PM',
    ticket_price_id: 'Rp 10.000',
    ticket_price_en: 'IDR 10,000',
    google_maps_url: 'https://goo.gl/maps/monjali',
    status: 'published',
  },
];

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

async function getExistingLocations() {
  console.log('🔍 Checking existing locations...');

  try {
    const result = await directusRequest('/items/map_locations?fields=id&limit=-1');
    const existingIds = result.data.map(item => item.id);
    console.log(`   Found ${existingIds.length} existing locations`);
    return new Set(existingIds);
  } catch (error) {
    console.log('   No existing locations found');
    return new Set();
  }
}

async function createMapLocation(location) {
  try {
    await directusRequest('/items/map_locations', {
      method: 'POST',
      body: JSON.stringify(location),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function importLocations() {
  try {
    await login();

    console.log('📊 Starting import of 2 locations...\n');

    const existingIds = await getExistingLocations();
    const toImport = locationsToImport.filter(loc => !existingIds.has(loc.id));

    if (toImport.length === 0) {
      console.log('✅ Both locations already exist!');
      process.exit(0);
    }

    console.log(`\n📝 Importing ${toImport.length} locations...\n`);
    console.log('─'.repeat(60));

    let successCount = 0;
    let failCount = 0;

    for (const location of toImport) {
      process.stdout.write(`   Importing ${location.id}...`);

      const result = await createMapLocation(location);

      if (result.success) {
        successCount++;
        console.log(' ✅');
      } else {
        failCount++;
        console.log(` ❌ (${result.error})`);
      }
    }

    console.log('─'.repeat(60));
    console.log(`\n✅ Import complete!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Failed: ${failCount}`);
    console.log(`   Total locations in database: ${existingIds.size + successCount}`);

    console.log('\n🔄 Next Steps:');
    console.log('   • Refresh Directus UI to see new locations');
    console.log('   • Go to: Content → Map Locations');
    console.log('   • Verify data is correct');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

importLocations();
