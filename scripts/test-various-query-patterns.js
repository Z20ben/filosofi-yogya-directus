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

async function directusRequest(endpoint) {
  const url = `${DIRECTUS_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  return response.json();
}

async function testPatterns() {
  console.log('🧪 Testing Various Query Patterns...\n');

  await login();

  const testId = 'keraton-yogyakarta';

  // Pattern 1: Basic query
  console.log('1️⃣ Basic query (no language):');
  try {
    const data = await directusRequest(`/items/map_locations/${testId}`);
    console.log(`   Name: ${data.data.name}`);
    console.log(`   Translations: ${JSON.stringify(data.data.translations)}`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Pattern 2: With fields including translations
  console.log('\n2️⃣ With fields and translations expanded:');
  try {
    const data = await directusRequest(`/items/map_locations/${testId}?fields=*,translations.*`);
    console.log(`   Name: ${data.data.name}`);
    console.log(`   Translations:`, JSON.stringify(data.data.translations, null, 2));
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Pattern 3: With language parameter
  console.log('\n3️⃣ With language=en-US:');
  try {
    const data = await directusRequest(`/items/map_locations/${testId}?language=en-US`);
    console.log(`   Name: ${data.data.name}`);
    console.log(`   (Expected: English translation)`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Pattern 4: With language and fields
  console.log('\n4️⃣ With language=en-US and fields:');
  try {
    const data = await directusRequest(`/items/map_locations/${testId}?language=en-US&fields=*,translations.*`);
    console.log(`   Name: ${data.data.name}`);
    console.log(`   Translations:`, JSON.stringify(data.data.translations, null, 2));
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Pattern 5: Direct translations table query
  console.log('\n5️⃣ Direct translations table query:');
  try {
    const data = await directusRequest(`/items/map_locations_translations?filter[map_locations_id][_eq]=${testId}`);
    console.log(`   Found ${data.data.length} translations:`);
    data.data.forEach(t => {
      console.log(`   - ${t.languages_code}: ${t.name}`);
    });
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Pattern 6: Check directus_languages
  console.log('\n6️⃣ Available languages:');
  try {
    const data = await directusRequest('/items/directus_languages');
    console.log(`   Found ${data.data.length} languages:`);
    data.data.forEach(l => {
      console.log(`   - ${l.code}: ${l.name}`);
    });
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  console.log('\n✅ Test complete!');
}

testPatterns().catch(console.error);
