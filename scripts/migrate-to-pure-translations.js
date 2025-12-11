/**
 * Migrate to Pure Content Translations Structure
 *
 * This script:
 * 1. Copies Indonesian data from main collection to translations table
 * 2. Removes translatable fields from main collection
 *
 * IMPORTANT: Backup already created. Run this after backup.
 */

import fetch from 'node-fetch';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = 'http://127.0.0.1:8055';
const { Client } = pg;
let accessToken = null;

// Define translatable fields for each collection
const COLLECTIONS = {
  map_locations: {
    translatableFields: ['name', 'description', 'address', 'opening_hours', 'ticket_price'],
    idField: 'map_locations_id',
  },
  destinasi_wisata: {
    translatableFields: ['name', 'location', 'description', 'hours'],
    idField: 'destinasi_wisata_id',
  },
  agenda_events: {
    translatableFields: ['title', 'description', 'location'],
    idField: 'agenda_events_id',
  },
  umkm_lokal: {
    translatableFields: ['name', 'description', 'address'],
    idField: 'umkm_lokal_id',
  },
  spot_nongkrong: {
    translatableFields: ['name', 'description', 'address'],
    idField: 'spot_nongkrong_id',
  },
  trending_articles: {
    translatableFields: ['title', 'excerpt', 'content', 'author'],
    idField: 'trending_articles_id',
  },
  encyclopedia_entries: {
    translatableFields: ['title', 'snippet', 'full_content', 'editor'],
    idField: 'encyclopedia_entries_id',
  },
};

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
  const data = await response.json();
  if (data.errors) throw new Error(data.errors[0].message);
  accessToken = data.data.access_token;
  console.log('✅ Authenticated\n');
}

async function directusRequest(endpoint, options = {}) {
  const url = `${DIRECTUS_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
  };
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

async function getDbClient() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  await client.connect();
  return client;
}

async function migrateCollection(collection, config, dbClient) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📦 ${collection.toUpperCase()}`);
  console.log('='.repeat(60));

  const transTable = `${collection}_translations`;
  const { translatableFields, idField } = config;

  // Step 1: Get all items from main collection
  console.log('\n1️⃣ Getting items from main collection...');
  const itemsResult = await directusRequest(`/items/${collection}?limit=-1`);

  if (!itemsResult.ok || !itemsResult.data.data) {
    console.log('   ❌ Failed to get items');
    return { collection, status: 'failed', error: 'Failed to get items' };
  }

  const items = itemsResult.data.data;
  console.log(`   Found ${items.length} items`);

  // Step 2: Check existing translations
  console.log('\n2️⃣ Checking existing translations...');
  const existingResult = await directusRequest(`/items/${transTable}?limit=-1`);
  const existingTrans = existingResult.data?.data || [];

  // Group by item ID and language
  const existingMap = new Map();
  existingTrans.forEach(t => {
    const key = `${t[idField]}-${t.languages_code}`;
    existingMap.set(key, t);
  });

  console.log(`   Found ${existingTrans.length} existing translations`);

  // Step 3: Create Indonesian translations from main collection data
  console.log('\n3️⃣ Creating Indonesian translations from main data...');

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of items) {
    const key = `${item.id}-id-ID`;

    if (existingMap.has(key)) {
      skipped++;
      continue;
    }

    // Build translation record from main collection fields
    const transRecord = {
      [idField]: item.id,
      languages_code: 'id-ID',
    };

    // Copy translatable fields
    let hasData = false;
    for (const field of translatableFields) {
      if (item[field] !== undefined && item[field] !== null) {
        transRecord[field] = item[field];
        hasData = true;
      }
    }

    if (!hasData) {
      skipped++;
      continue;
    }

    // Insert translation
    const insertResult = await directusRequest(`/items/${transTable}`, {
      method: 'POST',
      body: JSON.stringify(transRecord),
    });

    if (insertResult.ok) {
      created++;
    } else {
      errors++;
      if (errors <= 3) {
        console.log(`   ⚠️ Error creating translation for item ${item.id}:`, insertResult.data);
      }
    }
  }

  console.log(`   ✅ Created: ${created}, Skipped: ${skipped}, Errors: ${errors}`);

  // Step 4: Remove translatable fields from main collection using direct DB
  console.log('\n4️⃣ Removing translatable fields from main collection...');

  // First check which fields actually exist in the table
  const checkFieldsQuery = `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = $1 AND column_name = ANY($2)
  `;
  const existingFields = await dbClient.query(checkFieldsQuery, [collection, translatableFields]);
  const fieldsToRemove = existingFields.rows.map(r => r.column_name);

  if (fieldsToRemove.length === 0) {
    console.log('   ✅ No translatable fields to remove (already clean)');
  } else {
    console.log(`   Fields to remove: ${fieldsToRemove.join(', ')}`);

    for (const field of fieldsToRemove) {
      try {
        // Delete from directus_fields first
        await dbClient.query(`
          DELETE FROM directus_fields
          WHERE collection = $1 AND field = $2
        `, [collection, field]);

        // Then drop the column
        await dbClient.query(`ALTER TABLE ${collection} DROP COLUMN IF EXISTS ${field}`);
        console.log(`   ✅ Removed: ${field}`);
      } catch (err) {
        console.log(`   ⚠️ Error removing ${field}: ${err.message}`);
      }
    }
  }

  // Step 5: Configure translations field meta for translations collection fields
  console.log('\n5️⃣ Configuring translations collection field metadata...');

  for (const field of translatableFields) {
    // Check if field exists in translations table
    const fieldCheck = await dbClient.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = $1 AND column_name = $2
    `, [transTable, field]);

    if (fieldCheck.rows.length === 0) continue;

    // Determine interface based on field name
    let fieldInterface = 'input';
    let fieldType = 'string';

    if (field === 'description' || field === 'content' || field === 'full_content' || field === 'excerpt' || field === 'snippet') {
      fieldInterface = 'input-rich-text-html';
      fieldType = 'text';
    }

    // Check if meta exists
    const metaCheck = await dbClient.query(`
      SELECT id FROM directus_fields
      WHERE collection = $1 AND field = $2
    `, [transTable, field]);

    if (metaCheck.rows.length === 0) {
      // Insert new meta
      await dbClient.query(`
        INSERT INTO directus_fields (collection, field, interface, display, width)
        VALUES ($1, $2, $3, 'formatted-value', 'full')
      `, [transTable, field, fieldInterface]);
      console.log(`   ✅ Added meta for: ${field}`);
    } else {
      // Update existing meta
      await dbClient.query(`
        UPDATE directus_fields
        SET interface = $3, display = 'formatted-value', width = 'full'
        WHERE collection = $1 AND field = $2
      `, [transTable, field, fieldInterface]);
      console.log(`   ✅ Updated meta for: ${field}`);
    }
  }

  // Configure languages_code field
  const langMetaCheck = await dbClient.query(`
    SELECT id FROM directus_fields
    WHERE collection = $1 AND field = 'languages_code'
  `, [transTable]);

  if (langMetaCheck.rows.length === 0) {
    await dbClient.query(`
      INSERT INTO directus_fields (collection, field, interface, special, hidden, width)
      VALUES ($1, 'languages_code', 'select-dropdown-m2o', '["m2o"]', false, 'half')
    `, [transTable]);
  }

  return { collection, status: 'success', created, skipped, errors };
}

async function main() {
  console.log('🔄 MIGRATE TO PURE CONTENT TRANSLATIONS');
  console.log('='.repeat(60));
  console.log('This will:');
  console.log('1. Copy Indonesian data from main to translations');
  console.log('2. Remove translatable fields from main collections');
  console.log('3. Configure proper field metadata\n');

  await login();

  const dbClient = await getDbClient();
  const results = [];

  try {
    for (const [collection, config] of Object.entries(COLLECTIONS)) {
      const result = await migrateCollection(collection, config, dbClient);
      results.push(result);
    }

    // Summary
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60) + '\n');

    results.forEach(r => {
      const status = r.status === 'success' ? '✅' : '❌';
      console.log(`${status} ${r.collection}: ${r.status}`);
      if (r.created !== undefined) {
        console.log(`   Created: ${r.created}, Skipped: ${r.skipped}, Errors: ${r.errors}`);
      }
    });

    console.log('\n📋 NEXT STEPS:');
    console.log('1. Restart Directus: Ctrl+C then npm run start');
    console.log('2. Clear browser cache (Ctrl+Shift+Delete)');
    console.log('3. Open any collection - should see translations tabs');
    console.log('4. Click on item - translatable fields should be in right panel');

  } finally {
    await dbClient.end();
  }
}

main().catch(console.error);
