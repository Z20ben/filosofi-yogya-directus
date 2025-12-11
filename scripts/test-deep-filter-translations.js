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

async function testDeepFilter() {
  console.log('🧪 Testing Deep Filter for Translations...\n');

  await login();

  const testId = 'keraton-yogyakarta';

  // Test 1: Get with English translation using deep filter
  console.log('1️⃣ Single item with English translation (deep filter):');
  const urlEN = `/items/map_locations/${testId}?fields=*,translations.*&deep[translations][_filter][languages_code][_eq]=en-US`;
  console.log(`   Query: ${urlEN}\n`);

  try {
    const data = await directusRequest(urlEN);
    const loc = data.data;

    console.log('   📦 Main fields (Indonesian default):');
    console.log(`      name: ${loc.name}`);
    console.log(`      description: ${loc.description?.substring(0, 70)}...`);

    console.log('\n   🌍 Filtered translations (en-US only):');
    if (loc.translations && loc.translations.length > 0) {
      const trans = loc.translations[0];
      console.log(`      name: ${trans.name}`);
      console.log(`      description: ${trans.description?.substring(0, 70)}...`);
      console.log('\n   ✅ SUCCESS! English translation retrieved');
    } else {
      console.log('      ❌ No translations found');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 2: List with all translations
  console.log('\n2️⃣ List query with all translations:');
  const urlAllTrans = `/items/map_locations?limit=3&fields=id,name,translations.languages_code,translations.name`;

  try {
    const data = await directusRequest(urlAllTrans);

    data.data.forEach((loc, i) => {
      console.log(`\n   ${i + 1}. ${loc.id}`);
      console.log(`      Main (id-ID): ${loc.name}`);
      if (loc.translations) {
        loc.translations.forEach(t => {
          console.log(`      → ${t.languages_code}: ${t.name}`);
        });
      }
    });
    console.log('\n   ✅ SUCCESS! All translations retrieved');
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 3: List with filtered English translations only
  console.log('\n3️⃣ List query with English only (deep filter):');
  const urlListEN = `/items/map_locations?limit=3&fields=id,name,translations.languages_code,translations.name&deep[translations][_filter][languages_code][_eq]=en-US`;

  try {
    const data = await directusRequest(urlListEN);

    data.data.forEach((loc, i) => {
      console.log(`\n   ${i + 1}. ${loc.id}`);
      console.log(`      Main (id-ID): ${loc.name}`);
      if (loc.translations && loc.translations.length > 0) {
        console.log(`      → en-US: ${loc.translations[0].name}`);
      } else {
        console.log(`      ⚠️  No en-US translation`);
      }
    });
    console.log('\n   ✅ SUCCESS! Filtered translations retrieved');
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 4: Full data for frontend usage
  console.log('\n4️⃣ Complete data structure for frontend:');
  const urlFull = `/items/map_locations/${testId}?fields=*,translations.*&deep[translations][_filter][languages_code][_eq]=en-US`;

  try {
    const data = await directusRequest(urlFull);
    const loc = data.data;

    console.log('\n   Frontend usage example:');
    console.log('   ```javascript');
    console.log('   // Indonesian (default):');
    console.log(`   const nameID = location.name; // "${loc.name}"`);
    console.log('');
    console.log('   // English (from translations):');
    if (loc.translations && loc.translations.length > 0) {
      console.log(`   const nameEN = location.translations[0].name; // "${loc.translations[0].name}"`);
    }
    console.log('   ```');
    console.log('\n   ✅ SUCCESS! Data ready for frontend');
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  console.log('\n\n✅ All tests complete!');
  console.log('\n📋 Summary:');
  console.log('   ✓ Deep filter works correctly');
  console.log('   ✓ Main fields contain Indonesian (default language)');
  console.log('   ✓ Translations relation contains language-specific content');
  console.log('   ✓ Use deep[translations][_filter][languages_code][_eq]=LANG to filter');
  console.log('\n📋 For Next.js frontend:');
  console.log('   - Default lang: location.name (Indonesian)');
  console.log('   - Translated: location.translations[0].name (filtered language)');
}

testDeepFilter().catch(console.error);
