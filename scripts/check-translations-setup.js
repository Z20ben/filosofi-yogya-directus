import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const DIRECTUS_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN;

async function directusRequest(endpoint, options = {}) {
  const url = `${DIRECTUS_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();
  return { status: response.status, data };
}

async function checkTranslationsSetup() {
  console.log('🔍 Checking Directus Translations Setup...\n');

  // 1. Check if directus_languages collection exists
  console.log('1️⃣ Checking languages collection...');
  const languagesResult = await directusRequest('/items/directus_languages');

  if (languagesResult.status === 200) {
    console.log('✅ Languages collection exists');
    console.log('📋 Available languages:');
    languagesResult.data.data.forEach(lang => {
      console.log(`   - ${lang.code}: ${lang.name} (direction: ${lang.direction})`);
    });
  } else {
    console.log('❌ Languages collection not found or not accessible');
    console.log('   You need to enable translations in Directus settings');
  }

  console.log('\n2️⃣ Checking map_locations structure...');
  const fieldsResult = await directusRequest('/fields/map_locations');

  if (fieldsResult.status === 200) {
    const fields = fieldsResult.data.data;

    // Identify translatable fields (fields with _id and _en suffixes)
    const translatableFields = new Map();
    const nonTranslatableFields = [];

    fields.forEach(field => {
      const fieldName = field.field;

      if (fieldName.endsWith('_id')) {
        const baseName = fieldName.slice(0, -3);
        if (!translatableFields.has(baseName)) {
          translatableFields.set(baseName, { id: fieldName, en: null });
        } else {
          translatableFields.get(baseName).id = fieldName;
        }
      } else if (fieldName.endsWith('_en')) {
        const baseName = fieldName.slice(0, -3);
        if (!translatableFields.has(baseName)) {
          translatableFields.set(baseName, { id: null, en: fieldName });
        } else {
          translatableFields.get(baseName).en = fieldName;
        }
      } else if (!['id', 'status', 'date_created', 'date_updated', 'user_created', 'user_updated'].includes(fieldName)) {
        nonTranslatableFields.push(fieldName);
      }
    });

    console.log('\n📝 Fields that need translation:');
    translatableFields.forEach((value, key) => {
      console.log(`   - ${key}:`);
      console.log(`     • ${value.id || 'missing'} (Indonesian)`);
      console.log(`     • ${value.en || 'missing'} (English)`);
    });

    console.log('\n🔧 Non-translatable fields:');
    nonTranslatableFields.forEach(field => {
      console.log(`   - ${field}`);
    });

    console.log('\n📊 Summary:');
    console.log(`   Total translatable field pairs: ${translatableFields.size}`);
    console.log(`   Total non-translatable fields: ${nonTranslatableFields.length}`);
    console.log(`   Total records to migrate: 29`);
  }

  console.log('\n3️⃣ Checking if map_locations_translations exists...');
  const translationsResult = await directusRequest('/collections/map_locations_translations');

  if (translationsResult.status === 200) {
    console.log('✅ map_locations_translations collection already exists');
  } else {
    console.log('ℹ️  map_locations_translations does not exist yet (will be created)');
  }
}

checkTranslationsSetup().catch(console.error);
