import fetch from 'node-fetch';
import { readFileSync, readdirSync } from 'fs';
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

async function migrateData() {
  console.log('🔄 Migrating map_locations data to translations format...\n');

  await login();

  // Load backup
  console.log('1️⃣ Loading backup data...');
  let backupFiles;
  try {
    backupFiles = readdirSync('./backups')
      .filter(f => f.startsWith('backup-map-locations-') && f.endsWith('.json'))
      .map(f => `./backups/${f}`);
  } catch (err) {
    backupFiles = [];
  }

  if (backupFiles.length === 0) {
    console.log('❌ No backup file found!');
    console.log('   Run: node scripts/backup-map-locations.js first');
    return;
  }

  const latestBackup = backupFiles.sort().reverse()[0];
  console.log(`📁 Using: ${latestBackup}`);

  const backup = JSON.parse(readFileSync(latestBackup, 'utf-8'));
  const locations = backup.data;

  console.log(`✅ Loaded ${locations.length} records\n`);

  // Migrate each record
  console.log('2️⃣ Migrating data...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const location of locations) {
    try {
      console.log(`   📍 Migrating: ${location.id}...`);

      // Create English (en-US) translation in translations table
      // Note: We keep the old _id/_en fields in main table for now
      const translationData = {
        map_locations_id: location.id,
        languages_code: 'en-US',
        name: location.name_en,
        description: location.description_en,
        address: location.address_en,
        opening_hours: location.opening_hours_en,
        ticket_price: location.ticket_price_en,
      };

      try {
        // Try to create translation
        await directusRequest('/items/map_locations_translations', {
          method: 'POST',
          body: JSON.stringify(translationData)
        });
      } catch (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          // Translation exists, skip or update
          console.log(`      ⏭️  Translation already exists, skipping`);
        } else {
          throw error;
        }
      }

      console.log(`      ✅ ${location.name_id}`);
      successCount++;

    } catch (error) {
      console.log(`      ❌ Failed: ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n3️⃣ Migration Summary:');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📊 Total: ${locations.length}`);

  if (errorCount > 0) {
    console.log('\n⚠️  Some records failed to migrate.');
    console.log('   Check errors above and ensure:');
    console.log('   1. New fields exist (run step1)');
    console.log('   2. Translations table exists');
    console.log('   3. Translations are enabled in collection');
  } else {
    console.log('\n✅ All records migrated successfully!');
    console.log('\n📋 Next step:');
    console.log('   Run verification: node scripts/migrate-map-locations-step3-verify.js');
  }
}

migrateData().catch(console.error);
