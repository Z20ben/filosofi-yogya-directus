/**
 * Set Field Widths for Better Layout
 *
 * Configure fields to display side-by-side (width: 'half'):
 * - category | subcategory
 * - latitude | longitude
 * - opening_hours_id | opening_hours_en
 * - ticket_price_id | ticket_price_en
 * - address_id | address_en
 * - name_id | name_en
 * - phone | email
 * - whatsapp | website
 * - instagram | facebook
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

async function updateFieldWidth(collection, field, width) {
  try {
    await directusRequest(`/fields/${collection}/${field}`, {
      method: 'PATCH',
      body: JSON.stringify({
        meta: {
          width: width,
        },
      }),
    });
  } catch (error) {
    console.error(`   ⚠️  Could not update ${field}:`, error.message);
  }
}

async function setFieldWidths() {
  try {
    await login();

    console.log('📐 Setting Field Widths for Better Layout...\n');

    // ID - full width (primary key)
    await updateFieldWidth('map_locations', 'id', 'full');
    console.log('   ✅ id → full width');

    // Names - side by side
    console.log('\n📝 Names (side-by-side):');
    await updateFieldWidth('map_locations', 'name_id', 'half');
    console.log('   ✅ name_id → half width');
    await updateFieldWidth('map_locations', 'name_en', 'half');
    console.log('   ✅ name_en → half width');

    // Descriptions - full width (long text)
    console.log('\n📄 Descriptions (full width for readability):');
    await updateFieldWidth('map_locations', 'description_id', 'full');
    console.log('   ✅ description_id → full width');
    await updateFieldWidth('map_locations', 'description_en', 'full');
    console.log('   ✅ description_en → full width');

    // Category & Subcategory - side by side
    console.log('\n🏷️  Category (side-by-side):');
    await updateFieldWidth('map_locations', 'category', 'half');
    console.log('   ✅ category → half width');
    await updateFieldWidth('map_locations', 'subcategory', 'half');
    console.log('   ✅ subcategory → half width');

    // Coordinates - side by side
    console.log('\n🌍 Coordinates (side-by-side):');
    await updateFieldWidth('map_locations', 'latitude', 'half');
    console.log('   ✅ latitude → half width');
    await updateFieldWidth('map_locations', 'longitude', 'half');
    console.log('   ✅ longitude → half width');

    // Addresses - side by side
    console.log('\n📍 Addresses (side-by-side):');
    await updateFieldWidth('map_locations', 'address_id', 'half');
    console.log('   ✅ address_id → half width');
    await updateFieldWidth('map_locations', 'address_en', 'half');
    console.log('   ✅ address_en → half width');

    // Google Maps URL - full width
    await updateFieldWidth('map_locations', 'google_maps_url', 'full');
    console.log('   ✅ google_maps_url → full width');

    // Image - full width
    await updateFieldWidth('map_locations', 'image', 'full');
    console.log('   ✅ image → full width');

    // Opening Hours - side by side
    console.log('\n🕐 Opening Hours (side-by-side):');
    await updateFieldWidth('map_locations', 'opening_hours_id', 'half');
    console.log('   ✅ opening_hours_id → half width');
    await updateFieldWidth('map_locations', 'opening_hours_en', 'half');
    console.log('   ✅ opening_hours_en → half width');

    // Ticket Prices - side by side
    console.log('\n🎫 Ticket Prices (side-by-side):');
    await updateFieldWidth('map_locations', 'ticket_price_id', 'half');
    console.log('   ✅ ticket_price_id → half width');
    await updateFieldWidth('map_locations', 'ticket_price_en', 'half');
    console.log('   ✅ ticket_price_en → half width');

    // Facilities - full width (tags need space)
    await updateFieldWidth('map_locations', 'facilities', 'full');
    console.log('   ✅ facilities → full width');

    // Contact - pairs side by side
    console.log('\n📞 Contact (side-by-side):');
    await updateFieldWidth('map_locations', 'phone', 'half');
    console.log('   ✅ phone → half width');
    await updateFieldWidth('map_locations', 'email', 'half');
    console.log('   ✅ email → half width');

    await updateFieldWidth('map_locations', 'whatsapp', 'half');
    console.log('   ✅ whatsapp → half width');
    await updateFieldWidth('map_locations', 'website', 'half');
    console.log('   ✅ website → half width');

    // Social Media - side by side
    console.log('\n📱 Social Media (side-by-side):');
    await updateFieldWidth('map_locations', 'instagram', 'half');
    console.log('   ✅ instagram → half width');
    await updateFieldWidth('map_locations', 'facebook', 'half');
    console.log('   ✅ facebook → half width');

    // System - full width
    console.log('\n⚙️  System Fields:');
    await updateFieldWidth('map_locations', 'status', 'full');
    console.log('   ✅ status → full width');
    await updateFieldWidth('map_locations', 'sort', 'full');
    console.log('   ✅ sort → full width');
    await updateFieldWidth('map_locations', 'created_at', 'half');
    console.log('   ✅ created_at → half width');
    await updateFieldWidth('map_locations', 'updated_at', 'half');
    console.log('   ✅ updated_at → half width');

    console.log('\n✅ Field widths configured!');
    console.log('\n📐 Layout Structure:');
    console.log('   ┌─────────────────────────────────────────┐');
    console.log('   │ ID                                      │ ← full');
    console.log('   ├────────────────────┬────────────────────┤');
    console.log('   │ Name (ID)          │ Name (EN)          │ ← half | half');
    console.log('   ├────────────────────┴────────────────────┤');
    console.log('   │ Description (ID)                        │ ← full');
    console.log('   │ Description (EN)                        │ ← full');
    console.log('   ├────────────────────┬────────────────────┤');
    console.log('   │ Category           │ Subcategory        │ ← half | half');
    console.log('   ├────────────────────┼────────────────────┤');
    console.log('   │ Latitude           │ Longitude          │ ← half | half');
    console.log('   ├────────────────────┼────────────────────┤');
    console.log('   │ Address (ID)       │ Address (EN)       │ ← half | half');
    console.log('   ├────────────────────┴────────────────────┤');
    console.log('   │ Google Maps URL                         │ ← full');
    console.log('   │ Image                                   │ ← full');
    console.log('   ├────────────────────┬────────────────────┤');
    console.log('   │ Opening Hours (ID) │ Opening Hours (EN) │ ← half | half');
    console.log('   ├────────────────────┼────────────────────┤');
    console.log('   │ Ticket Price (ID)  │ Ticket Price (EN)  │ ← half | half');
    console.log('   ├────────────────────┴────────────────────┤');
    console.log('   │ Facilities                              │ ← full');
    console.log('   ├────────────────────┬────────────────────┤');
    console.log('   │ Phone              │ Email              │ ← half | half');
    console.log('   ├────────────────────┼────────────────────┤');
    console.log('   │ WhatsApp           │ Website            │ ← half | half');
    console.log('   ├────────────────────┼────────────────────┤');
    console.log('   │ Instagram          │ Facebook           │ ← half | half');
    console.log('   ├────────────────────┴────────────────────┤');
    console.log('   │ Status                                  │ ← full');
    console.log('   ├────────────────────┬────────────────────┤');
    console.log('   │ Created At         │ Updated At         │ ← half | half');
    console.log('   └────────────────────┴────────────────────┘');
    console.log('\n🔄 Next Steps:');
    console.log('   • Restart Directus server');
    console.log('   • Hard refresh browser (Ctrl+Shift+R)');
    console.log('   • Check Map Locations form - beautiful layout! ✨');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setFieldWidths();
