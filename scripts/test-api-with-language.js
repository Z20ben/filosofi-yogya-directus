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

async function testAPIWithLanguage() {
  console.log('🧪 Testing API with Language Filter...\n');

  await login();
  console.log('✅ Authenticated\n');

  // Test 1: Query with Indonesian (id-ID)
  console.log('1️⃣ Testing Indonesian (id-ID)...');
  try {
    const idResponse = await directusRequest('/items/map_locations/keraton-yogyakarta?language=id-ID');
    const idLocation = idResponse.data;

    console.log('✅ Success!');
    console.log(`   Name: ${idLocation.name}`);
    console.log(`   Description: ${idLocation.description?.substring(0, 80)}...`);
    console.log(`   Address: ${idLocation.address?.substring(0, 50)}...`);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 2: Query with English (en-US)
  console.log('\n2️⃣ Testing English (en-US)...');
  try {
    const enResponse = await directusRequest('/items/map_locations/keraton-yogyakarta?language=en-US');
    const enLocation = enResponse.data;

    console.log('✅ Success!');
    console.log(`   Name: ${enLocation.name}`);
    console.log(`   Description: ${enLocation.description?.substring(0, 80)}...`);
    console.log(`   Address: ${enLocation.address?.substring(0, 50)}...`);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 3: List query with Indonesian
  console.log('\n3️⃣ Testing list query (id-ID)...');
  try {
    const listResponse = await directusRequest('/items/map_locations?language=id-ID&limit=3');
    const locations = listResponse.data;

    console.log(`✅ Retrieved ${locations.length} locations:`);
    locations.forEach((loc, i) => {
      console.log(`   ${i + 1}. ${loc.name} (${loc.id})`);
    });
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 4: List query with English
  console.log('\n4️⃣ Testing list query (en-US)...');
  try {
    const listResponse = await directusRequest('/items/map_locations?language=en-US&limit=3');
    const locations = listResponse.data;

    console.log(`✅ Retrieved ${locations.length} locations:`);
    locations.forEach((loc, i) => {
      console.log(`   ${i + 1}. ${loc.name} (${loc.id})`);
    });
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n✅ Test complete!');
  console.log('\n📋 If translations work correctly:');
  console.log('   - Indonesian query shows Indonesian content');
  console.log('   - English query shows English content');
  console.log('   - Content is different between languages');
  console.log('\n📋 Next: You can cleanup old _id/_en fields');
  console.log('   Run: node scripts/migrate-map-locations-step4-cleanup.js');
}

testAPIWithLanguage().catch(console.error);
