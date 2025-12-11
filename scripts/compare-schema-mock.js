/**
 * Compare Directus Schema with Mock Data Types
 * This helps identify field mapping issues before import
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = 'http://127.0.0.1:8055';
let accessToken = null;

// Mock data field definitions (from types files)
const MOCK_TYPES = {
  destinasi_wisata: {
    main: ['id', 'slug', 'image', 'latitude', 'longitude', 'status'],
    localized: ['name', 'location', 'description', 'hours'],
  },
  agenda_events: {
    main: ['id', 'slug', 'image', 'gradient', 'bgColor', 'status'],
    localized: ['title', 'category', 'date', 'time', 'location', 'price', 'age'],
  },
  umkm_lokal: {
    main: ['id', 'slug', 'category', 'image', 'tags', 'latitude', 'longitude', 'rating', 'reviews', 'status'],
    localized: ['name', 'type', 'location', 'price', 'description', 'highlight'],
  },
  spot_nongkrong: {
    main: ['id', 'slug', 'image', 'rating', 'reviews', 'tags', 'latitude', 'longitude', 'status'],
    localized: ['name', 'category', 'location', 'budget', 'hours', 'description', 'badges'],
  },
  trending_articles: {
    main: ['id', 'slug', 'image', 'category', 'readTime', 'views', 'comments', 'tags', 'featured', 'status'],
    localized: ['title', 'excerpt', 'author', 'date'],
  },
  encyclopedia_entries: {
    main: ['id', 'slug', 'category', 'icon', 'tags', 'views', 'featured', 'status'],
    localized: ['title', 'snippet', 'fullContent', 'editor'],
  },
};

async function login() {
  const response = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    }),
  });
  const data = await response.json();
  if (data.errors) throw new Error(data.errors[0].message);
  accessToken = data.data.access_token;
}

async function getCollectionFields(collection) {
  const response = await fetch(`${DIRECTUS_URL}/fields/${collection}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();
  return data.data?.map(f => ({
    field: f.field,
    type: f.type || f.schema?.data_type,
    required: !f.schema?.is_nullable,
  })) || [];
}

async function compareSchemas() {
  console.log('='.repeat(70));
  console.log('📊 SCHEMA vs MOCK DATA COMPARISON');
  console.log('='.repeat(70));

  await login();

  for (const [collection, mockFields] of Object.entries(MOCK_TYPES)) {
    console.log(`\n\n📦 ${collection.toUpperCase()}`);
    console.log('-'.repeat(70));

    // Get main collection fields
    const mainFields = await getCollectionFields(collection);
    const mainFieldNames = mainFields.map(f => f.field);

    // Get translation collection fields
    const transCollection = `${collection}_translations`;
    const transFields = await getCollectionFields(transCollection);
    const transFieldNames = transFields.map(f => f.field);

    // Compare main fields
    console.log('\n🔹 MAIN TABLE FIELDS:');
    console.log('   Directus Schema            | Mock Type         | Status');
    console.log('   ' + '-'.repeat(65));

    // List all Directus fields
    for (const field of mainFields) {
      const inMock = mockFields.main.includes(field.field);
      const status = inMock ? '✅ Match' : (field.field.startsWith('date_') || field.field.startsWith('user_') ? '⚪ System' : '⚠️ Extra');
      console.log(`   ${field.field.padEnd(25)} | ${field.type?.padEnd(17) || 'alias'.padEnd(17)} | ${status}`);
    }

    // Check for missing mock fields
    for (const mockField of mockFields.main) {
      if (!mainFieldNames.includes(mockField)) {
        console.log(`   ${mockField.padEnd(25)} | ${'(missing)'.padEnd(17)} | ❌ Not in Directus`);
      }
    }

    // Compare translation fields
    console.log('\n🔹 TRANSLATION TABLE FIELDS:');
    console.log('   Directus Schema            | Mock Localized    | Status');
    console.log('   ' + '-'.repeat(65));

    for (const field of transFields) {
      const inMock = mockFields.localized.includes(field.field);
      const isSystem = ['id', 'languages_code', `${collection}_id`].includes(field.field);
      const status = isSystem ? '⚪ System' : (inMock ? '✅ Match' : '⚠️ Extra');
      console.log(`   ${field.field.padEnd(25)} | ${field.type?.padEnd(17) || 'alias'.padEnd(17)} | ${status}`);
    }

    // Check for missing localized fields
    for (const mockField of mockFields.localized) {
      if (!transFieldNames.includes(mockField)) {
        console.log(`   ${mockField.padEnd(25)} | ${'(missing)'.padEnd(17)} | ❌ Not in Directus`);
      }
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(70));
  console.log('📋 LEGEND:');
  console.log('   ✅ Match      - Field exists in both Mock and Directus');
  console.log('   ⚪ System     - Directus system field (auto-managed)');
  console.log('   ⚠️ Extra      - Directus field not in Mock (may need mapping)');
  console.log('   ❌ Not in DB  - Mock field missing from Directus schema');
  console.log('='.repeat(70));
}

compareSchemas().catch(console.error);
