import fetch from 'node-fetch';
import { writeFileSync } from 'fs';
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

async function directusRequest(endpoint) {
  const url = `${DIRECTUS_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
  };

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function backupAll() {
  console.log('💾 BACKING UP ALL COLLECTIONS\n');
  console.log('='.repeat(60));

  await login();

  const collections = [
    'map_locations',
    'map_locations_translations',
    'destinasi_wisata',
    'destinasi_wisata_translations',
    'agenda_events',
    'agenda_events_translations',
    'umkm_lokal',
    'umkm_lokal_translations',
    'spot_nongkrong',
    'spot_nongkrong_translations',
    'trending_articles',
    'trending_articles_translations',
    'encyclopedia_entries',
    'encyclopedia_entries_translations',
  ];

  const timestamp = Date.now();
  let totalRecords = 0;
  const results = [];

  for (const collection of collections) {
    try {
      console.log(`\n📦 Backing up ${collection}...`);

      const data = await directusRequest(`/items/${collection}?limit=-1`);
      const recordCount = data.data ? data.data.length : 0;

      const filename = `backups/backup-${collection}-${timestamp}.json`;
      writeFileSync(filename, JSON.stringify(data, null, 2));

      console.log(`   ✅ ${recordCount} records → ${filename}`);

      totalRecords += recordCount;
      results.push({ collection, records: recordCount, file: filename });

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      results.push({ collection, records: 0, error: error.message });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 BACKUP SUMMARY\n');

  results.forEach(r => {
    if (r.error) {
      console.log(`   ❌ ${r.collection}: ERROR - ${r.error}`);
    } else {
      console.log(`   ✅ ${r.collection}: ${r.records} records`);
    }
  });

  console.log(`\n   TOTAL: ${totalRecords} records backed up`);
  console.log(`\n💾 All backups saved to: backups/backup-*-${timestamp}.json`);
}

backupAll().catch(console.error);
