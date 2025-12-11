import fetch from 'node-fetch';
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

async function verifyMigration() {
  console.log('🔍 Verifying Migration...\n');

  await login();

  // Test 1: Indonesian content
  console.log('1️⃣ Testing Indonesian (id-ID) content...');
  try {
    const idResponse = await directusRequest('/items/map_locations?language=id-ID&limit=3');
    const idLocations = idResponse.data;

    console.log(`✅ Retrieved ${idLocations.length} records`);
    if (idLocations.length > 0) {
      console.log(`   Sample: "${idLocations[0].name}" (${idLocations[0].id})`);
    }
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }

  // Test 2: English content
  console.log('\n2️⃣ Testing English (en-US) content...');
  try {
    const enResponse = await directusRequest('/items/map_locations?language=en-US&limit=3');
    const enLocations = enResponse.data;

    console.log(`✅ Retrieved ${enLocations.length} records`);
    if (enLocations.length > 0) {
      console.log(`   Sample: "${enLocations[0].name}" (${enLocations[0].id})`);
    }
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }

  // Test 3: Specific record comparison
  console.log('\n3️⃣ Testing specific record (keraton-yogyakarta)...');
  try {
    const idRecord = await directusRequest('/items/map_locations/keraton-yogyakarta?language=id-ID');
    const enRecord = await directusRequest('/items/map_locations/keraton-yogyakarta?language=en-US');

    console.log('   Indonesian:');
    console.log(`      Name: ${idRecord.data.name}`);
    console.log(`      Desc: ${idRecord.data.description?.substring(0, 50)}...`);

    console.log('\n   English:');
    console.log(`      Name: ${enRecord.data.name}`);
    console.log(`      Desc: ${enRecord.data.description?.substring(0, 50)}...`);

    // Verify they're different
    if (idRecord.data.name !== enRecord.data.name) {
      console.log('\n   ✅ Translations are working correctly!');
    } else {
      console.log('\n   ⚠️  Warning: Both languages show same content');
    }

  } catch (error) {
    console.log('❌ Failed:', error.message);
  }

  // Test 4: Check all records have translations
  console.log('\n4️⃣ Checking translation coverage...');
  try {
    const allRecords = await directusRequest('/items/map_locations?limit=-1');
    const totalRecords = allRecords.data.length;

    const translationsResponse = await directusRequest('/items/map_locations_translations?limit=-1');
    const translations = translationsResponse.data;

    const enTranslations = translations.filter(t => t.languages_code === 'en-US');

    console.log(`   📊 Total records: ${totalRecords}`);
    console.log(`   🌍 English translations: ${enTranslations.length}`);

    if (enTranslations.length === totalRecords) {
      console.log('   ✅ All records have English translations!');
    } else {
      console.log(`   ⚠️  Missing ${totalRecords - enTranslations.length} English translations`);
    }

  } catch (error) {
    console.log('❌ Failed:', error.message);
  }

  console.log('\n✅ Verification complete!');
  console.log('\n📋 If all tests passed, you can:');
  console.log('   1. Run cleanup: node scripts/migrate-map-locations-step4-cleanup.js');
  console.log('   2. This will delete old _id/_en fields');
}

verifyMigration().catch(console.error);
