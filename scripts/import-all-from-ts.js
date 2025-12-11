/**
 * Import All Locations from filosofi-yogya-mod/lib/data/mapLocations.ts
 *
 * Transforms TypeScript data format to Directus flat format
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';

const DIRECTUS_URL = process.env.PUBLIC_URL || 'http://localhost:8055';
let accessToken = null;

// Read and parse the TypeScript file
const tsFilePath = 'D:\\Dev\\next-budaya\\filosofi-yogya-mod\\lib\\data\\mapLocations.ts';
console.log('📖 Reading:', tsFilePath);

const tsContent = readFileSync(tsFilePath, 'utf-8');

// Extract mapLocations array (simple regex-based extraction)
const arrayMatch = tsContent.match(/export const mapLocations[^=]*=\s*\[([\s\S]*)\];/);
if (!arrayMatch) {
  console.error('❌ Could not extract mapLocations array');
  process.exit(1);
}

// Parse using eval (safe in this controlled context)
let mapLocations;
try {
  // Create a minimal eval context
  eval('mapLocations = [' + arrayMatch[1] + '];');
  console.log(`✅ Parsed ${mapLocations.length} locations from TypeScript file\n`);
} catch (error) {
  console.error('❌ Parse error:', error.message);
  process.exit(1);
}

// Transform to Directus format
function transformToDirectusFormat(location) {
  // Handle entry fee
  let ticket_price_id = null;
  let ticket_price_en = null;

  if (location.entryFee) {
    const parts = [];
    if (location.entryFee.local) {
      parts.push(`Lokal: Rp ${location.entryFee.local.toLocaleString('id-ID')}`);
    }
    if (location.entryFee.foreign) {
      parts.push(`Asing: Rp ${location.entryFee.foreign.toLocaleString('id-ID')}`);
    }
    ticket_price_id = parts.join(', ');

    const partsEn = [];
    if (location.entryFee.local) {
      partsEn.push(`Local: IDR ${location.entryFee.local.toLocaleString('en-US')}`);
    }
    if (location.entryFee.foreign) {
      partsEn.push(`Foreign: IDR ${location.entryFee.foreign.toLocaleString('en-US')}`);
    }
    ticket_price_en = partsEn.join(', ');
  }

  // Handle price range for culinary/UMKM
  if (!ticket_price_id && location.priceRange) {
    ticket_price_id = location.priceRange;
    ticket_price_en = location.priceRange;
  }

  return {
    id: location.id,
    name_id: location.name_id,
    name_en: location.name_en,
    description_id: location.description_id,
    description_en: location.description_en,
    category: location.category,
    subcategory: location.subcategory || null,
    latitude: location.coordinates.lat,
    longitude: location.coordinates.lng,
    address_id: location.address_id,
    address_en: location.address_en,
    opening_hours_id: location.openingHours || null,
    opening_hours_en: location.openingHours || null,
    ticket_price_id: ticket_price_id,
    ticket_price_en: ticket_price_en,
    facilities: location.facilities || null,
    phone: location.contact?.phone || null,
    email: location.contact?.email || null,
    whatsapp: location.contact?.whatsapp || null,
    website: location.website || null,
    instagram: location.socialMedia?.instagram || null,
    facebook: location.socialMedia?.facebook || null,
    google_maps_url: location.googleMapsUrl || null,
    status: 'published',
  };
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
    throw new Error(`Login failed: ${response.statusText}`);
  }

  const data = await response.json();
  accessToken = data.data.access_token;
  console.log('✅ Authenticated successfully\n');
}

async function getExistingLocations() {
  console.log('🔍 Checking existing locations...');

  try {
    const result = await directusRequest('/items/map_locations?fields=id&limit=-1');
    const existingIds = result.data.map(item => item.id);
    console.log(`   Found ${existingIds.length} existing locations`);
    return new Set(existingIds);
  } catch (error) {
    console.log('   No existing locations found');
    return new Set();
  }
}

async function createMapLocation(location) {
  try {
    await directusRequest('/items/map_locations', {
      method: 'POST',
      body: JSON.stringify(location),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function importAllLocations() {
  try {
    await login();

    console.log('📊 Starting import of all locations...\n');

    const existingIds = await getExistingLocations();

    // Transform all locations
    const transformedLocations = mapLocations.map(transformToDirectusFormat);
    const toImport = transformedLocations.filter(loc => !existingIds.has(loc.id));

    if (toImport.length === 0) {
      console.log('✅ All locations already imported!');
      console.log(`   Total: ${transformedLocations.length} locations`);
      process.exit(0);
    }

    console.log(`\n📝 Importing ${toImport.length} new locations...\n`);
    console.log('─'.repeat(60));

    let successCount = 0;
    let failCount = 0;
    const failed = [];

    for (const location of toImport) {
      process.stdout.write(`   ${(successCount + failCount + 1).toString().padStart(2)}. ${location.id.padEnd(35)}...`);

      const result = await createMapLocation(location);

      if (result.success) {
        successCount++;
        console.log(' ✅');
      } else {
        failCount++;
        failed.push({ id: location.id, error: result.error });
        console.log(' ❌');
      }
    }

    console.log('─'.repeat(60));
    console.log(`\n✅ Import complete!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Failed: ${failCount}`);
    console.log(`   Total in database: ${existingIds.size + successCount}/${transformedLocations.length}`);

    if (failed.length > 0) {
      console.log('\n❌ Failed imports:');
      failed.forEach(f => {
        console.log(`   - ${f.id}: ${f.error.substring(0, 80)}...`);
      });
    }

    console.log('\n🔄 Next Steps:');
    console.log('   • Refresh Directus UI');
    console.log('   • Go to: Content → Map Locations');
    console.log('   • Verify all data imported correctly');
    console.log(`   • Total should be: ${transformedLocations.length} locations`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

importAllLocations();
