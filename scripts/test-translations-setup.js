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
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

async function testTranslations() {
  console.log('🧪 Testing Translations Setup...\n');

  await login();
  console.log('✅ Authenticated\n');

  // Test 1: Check languages
  console.log('1️⃣ Checking languages...');
  try {
    const langs = await directusRequest('/items/directus_languages');
    console.log(`✅ Found ${langs.data.length} languages:`);
    langs.data.forEach(l => console.log(`   🌍 ${l.code}: ${l.name}`));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 2: Check translations table
  console.log('\n2️⃣ Checking translations table...');
  try {
    const trans = await directusRequest('/items/map_locations_translations?limit=5');
    console.log(`✅ Table accessible, ${trans.data.length} records found`);
    if (trans.data.length > 0) {
      console.log('   Sample:');
      trans.data.slice(0, 2).forEach(t => {
        console.log(`   - ${t.map_locations_id} (${t.languages_code}): ${t.name}`);
      });
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 3: Check map_locations fields
  console.log('\n3️⃣ Checking map_locations fields...');
  try {
    const fields = await directusRequest('/fields/map_locations');
    const fieldNames = fields.data.map(f => f.field);

    console.log(`   Total fields: ${fieldNames.length}`);
    console.log(`   Has translations field: ${fieldNames.includes('translations') ? '✅' : '❌'}`);
    console.log(`   Has old _id fields: ${fieldNames.some(f => f.endsWith('_id')) ? '✅' : '❌'}`);
    console.log(`   Has old _en fields: ${fieldNames.some(f => f.endsWith('_en')) ? '✅' : '❌'}`);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // Test 4: Get one location with translations
  console.log('\n4️⃣ Testing API query with translations...');
  try {
    const location = await directusRequest('/items/map_locations?limit=1&fields=*,translations.*');
    if (location.data.length > 0) {
      const loc = location.data[0];
      console.log(`✅ Retrieved location: ${loc.id}`);
      console.log(`   name_id: ${loc.name_id}`);
      console.log(`   name_en: ${loc.name_en}`);
      console.log(`   translations: ${loc.translations ? JSON.stringify(loc.translations).substring(0, 100) + '...' : 'null'}`);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n✅ Test complete!');
  console.log('\n📋 Summary:');
  console.log('   If all tests passed, you\'re ready to migrate data.');
  console.log('   Run: node scripts/migrate-map-locations-step2-migrate-data.js');
}

testTranslations().catch(console.error);
