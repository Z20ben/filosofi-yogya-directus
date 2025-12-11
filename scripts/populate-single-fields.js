import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.PUBLIC_URL || 'http://localhost:8055';
let accessToken = null;

async function login() {
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

async function populateFields() {
  console.log('📝 Populating Single Fields with Indonesian Content...\n');

  await login();
  console.log('✅ Authenticated\n');

  // Get all locations
  console.log('1️⃣ Fetching all locations...');
  const response = await directusRequest('/items/map_locations?limit=-1');
  const locations = response.data;

  console.log(`✅ Found ${locations.length} locations\n`);

  // Populate each location
  console.log('2️⃣ Populating single fields...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const location of locations) {
    try {
      console.log(`   📍 ${location.id}...`);

      // Copy from _id fields to single fields (Indonesian content as default)
      const updateData = {
        name: location.name_id,
        description: location.description_id,
        address: location.address_id,
        opening_hours: location.opening_hours_id,
        ticket_price: location.ticket_price_id,
      };

      await directusRequest(`/items/map_locations/${location.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });

      console.log(`      ✅ ${location.name_id}`);
      successCount++;

    } catch (error) {
      console.log(`      ❌ Error: ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n3️⃣ Summary:');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📊 Total: ${locations.length}`);

  if (errorCount === 0) {
    console.log('\n✅ All fields populated successfully!');
    console.log('\n📋 Next step:');
    console.log('   Test API with language filter');
    console.log('   Run: node scripts/test-api-with-language.js');
  }
}

populateFields().catch(console.error);
