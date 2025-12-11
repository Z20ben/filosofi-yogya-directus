/**
 * Reorganize Map Locations Fields
 *
 * Better field organization:
 * 1. Basic Info (ID, names, descriptions, category, subcategory)
 * 2. Location (coordinates, address, google maps)
 * 3. Media (image)
 * 4. Operations (hours, pricing, facilities)
 * 5. Contact (phone, email, whatsapp, website)
 * 6. Social Media (instagram, facebook)
 * 7. System (status, sort, timestamps) - ALWAYS LAST
 */

import 'dotenv/config';

const DIRECTUS_URL = process.env.PUBLIC_URL || 'http://localhost:8055';
let accessToken = null;

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

async function updateFieldSort(collection, field, sort, group = null) {
  try {
    const updates = {
      meta: {
        sort: sort,
      }
    };

    if (group !== undefined) {
      updates.meta.group = group;
    }

    await directusRequest(`/fields/${collection}/${field}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  } catch (error) {
    console.error(`   ⚠️  Could not update ${field}:`, error.message);
  }
}

async function reorganizeFields() {
  try {
    await login();

    console.log('📐 Reorganizing Map Locations Fields...\n');

    // Field organization with proper sort order
    const fieldOrder = {
      // ===== 1. BASIC INFO (1-10) =====
      'id': 1,
      'name_id': 2,
      'name_en': 3,
      'description_id': 4,
      'description_en': 5,
      'category': 6,
      'subcategory': 7,  // ← Right after category!

      // ===== 2. LOCATION (11-20) =====
      'latitude': 11,
      'longitude': 12,
      'address_id': 13,
      'address_en': 14,
      'google_maps_url': 15,  // ← Related to location

      // ===== 3. MEDIA (21-25) =====
      'image': 21,

      // ===== 4. OPERATIONS (26-35) =====
      'opening_hours_id': 26,
      'opening_hours_en': 27,
      'ticket_price_id': 28,
      'ticket_price_en': 29,
      'facilities': 30,

      // ===== 5. CONTACT (36-45) =====
      'phone': 36,
      'email': 37,
      'whatsapp': 38,
      'website': 39,

      // ===== 6. SOCIAL MEDIA (46-50) =====
      'instagram': 46,
      'facebook': 47,

      // ===== 7. SYSTEM (91-99) - ALWAYS LAST! =====
      'status': 91,
      'sort': 92,
      'created_at': 98,
      'updated_at': 99,
    };

    console.log('🔄 Updating field order...\n');

    // Update all fields
    for (const [field, sort] of Object.entries(fieldOrder)) {
      await updateFieldSort('map_locations', field, sort);
      console.log(`   ✅ ${field.padEnd(20)} → position ${sort}`);
    }

    console.log('\n✅ Field reorganization complete!');
    console.log('\n📋 New Organization:');
    console.log('   1️⃣  Basic Info (ID, Names, Category, Subcategory)');
    console.log('   2️⃣  Location (Coordinates, Address, Google Maps)');
    console.log('   3️⃣  Media (Image)');
    console.log('   4️⃣  Operations (Hours, Pricing, Facilities)');
    console.log('   5️⃣  Contact (Phone, Email, WhatsApp, Website)');
    console.log('   6️⃣  Social Media (Instagram, Facebook)');
    console.log('   7️⃣  System (Status, Sort, Timestamps) ← LAST');
    console.log('\n🔄 Next Steps:');
    console.log('   • Restart Directus server');
    console.log('   • Hard refresh browser (Ctrl+Shift+R)');
    console.log('   • Check Map Locations form - fields now organized!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

reorganizeFields();
