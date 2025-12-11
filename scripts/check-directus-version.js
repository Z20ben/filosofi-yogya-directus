import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.PUBLIC_URL || 'http://localhost:8055';

async function checkVersion() {
  console.log('🔍 Checking Directus Setup...\n');

  // Check server info (no auth needed)
  try {
    const response = await fetch(`${DIRECTUS_URL}/server/info`);
    const data = await response.json();

    console.log('📦 Directus Server Info:');
    console.log(`   Version: ${data.data?.directus?.version || 'unknown'}`);
    console.log(`   Node: ${data.data?.node?.version || 'unknown'}`);
    console.log();

  } catch (error) {
    console.log('⚠️  Could not get server info:', error.message);
  }

  // Login and check collections
  const loginResponse = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    }),
  });

  if (!loginResponse.ok) {
    console.log('❌ Login failed');
    return;
  }

  const loginData = await loginResponse.json();
  const token = loginData.data.access_token;

  // Check collections
  console.log('📋 Checking collections...\n');

  const collectionsResponse = await fetch(`${DIRECTUS_URL}/collections`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const collections = await collectionsResponse.json();
  const collectionNames = collections.data.map(c => c.collection);

  console.log('System collections:');
  const systemCollections = collectionNames.filter(c => c.startsWith('directus_'));
  systemCollections.forEach(c => {
    const isLang = c.includes('language');
    const isTrans = c.includes('translation');
    const icon = isLang || isTrans ? '🌍' : '⚙️';
    console.log(`   ${icon} ${c}`);
  });

  console.log('\nUser collections:');
  const userCollections = collectionNames.filter(c => !c.startsWith('directus_'));
  userCollections.forEach(c => console.log(`   📦 ${c}`));

  // Check map_locations fields
  console.log('\n🗺️  map_locations fields:');
  const fieldsResponse = await fetch(`${DIRECTUS_URL}/fields/map_locations`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const fields = await fieldsResponse.json();
  const fieldNames = fields.data.map(f => f.field);

  const hasOldFields = fieldNames.some(f => f.endsWith('_id') || f.endsWith('_en'));
  const hasNewFields = fieldNames.includes('name') &&
                        fieldNames.includes('description') &&
                        !fieldNames.includes('name_id');

  console.log(`   Old _id/_en fields: ${hasOldFields ? '✅ Present' : '❌ Not found'}`);
  console.log(`   New single fields: ${hasNewFields ? '✅ Present' : '❌ Not found'}`);

  // Check if there's a translations relation
  const hasTranslationsField = fieldNames.includes('translations');
  console.log(`   Translations field: ${hasTranslationsField ? '✅ Present' : '❌ Not found'}`);

  console.log('\n📊 Current state:');
  if (hasOldFields && !hasNewFields) {
    console.log('   Status: READY for manual approach (keeping _id/_en)');
  } else if (hasNewFields && hasTranslationsField) {
    console.log('   Status: READY for Directus Translations');
  } else if (hasOldFields && hasNewFields) {
    console.log('   Status: IN TRANSITION (both old and new fields exist)');
  }
}

checkVersion().catch(console.error);
