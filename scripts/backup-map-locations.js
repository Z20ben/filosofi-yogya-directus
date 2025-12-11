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

  if (!response.ok) {
    throw new Error('Login failed');
  }

  const data = await response.json();
  accessToken = data.data.access_token;
  console.log('✅ Authentication successful\n');
}

async function directusRequest(endpoint, options = {}) {
  const url = `${DIRECTUS_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`HTTP ${response.status}: ${error.message || JSON.stringify(error)}`);
  }

  return response.json();
}

async function backupMapLocations() {
  console.log('💾 Backing up map_locations...\n');

  await login();

  // Get all map_locations
  console.log('📥 Fetching all records...');
  const response = await directusRequest('/items/map_locations?limit=-1');
  const locations = response.data;

  console.log(`✅ Retrieved ${locations.length} records\n`);

  // Prepare backup data with structure analysis
  const backup = {
    backup_date: new Date().toISOString(),
    total_records: locations.length,
    structure_info: {
      approach: 'manual_id_en_fields',
      translatable_fields: [
        'name_id', 'name_en',
        'description_id', 'description_en',
        'address_id', 'address_en',
        'opening_hours_id', 'opening_hours_en',
        'ticket_price_id', 'ticket_price_en'
      ],
      non_translatable_fields: [
        'id', 'category', 'subcategory', 'latitude', 'longitude',
        'image', 'phone', 'email', 'whatsapp', 'website',
        'instagram', 'facebook', 'google_maps_url', 'facilities',
        'status', 'sort', 'date_created', 'date_updated'
      ]
    },
    data: locations
  };

  // Save to file
  const filename = `backup-map-locations-${Date.now()}.json`;
  const filepath = `./backups/${filename}`;

  // Create backups directory if not exists
  try {
    const { mkdirSync } = await import('fs');
    mkdirSync('./backups', { recursive: true });
  } catch (err) {
    // Directory might already exist
  }

  writeFileSync(filepath, JSON.stringify(backup, null, 2));

  console.log('✅ Backup saved!');
  console.log(`📁 File: ${filepath}`);
  console.log(`📊 Records: ${locations.length}`);
  console.log(`💾 Size: ${(JSON.stringify(backup).length / 1024).toFixed(2)} KB`);

  // Show sample of first record
  if (locations.length > 0) {
    console.log('\n📝 Sample record (first location):');
    console.log('   ID:', locations[0].id);
    console.log('   Name (ID):', locations[0].name_id);
    console.log('   Name (EN):', locations[0].name_en);
    console.log('   Has description:', !!(locations[0].description_id && locations[0].description_en));
    console.log('   Coordinates:', locations[0].latitude, locations[0].longitude);
  }

  console.log('\n✅ Backup complete! Ready for migration.');
}

backupMapLocations().catch(console.error);
