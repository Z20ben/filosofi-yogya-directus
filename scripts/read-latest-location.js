/**
 * Read Latest Location Created via UI
 *
 * To understand the exact format Directus expects
 */

import 'dotenv/config';

const DIRECTUS_URL = process.env.PUBLIC_URL || 'http://localhost:8055';

async function readLatestLocation() {
  try {
    // Login
    console.log('🔐 Logging in...');
    const loginResponse = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      }),
    });

    const loginData = await loginResponse.json();
    const token = loginData.data.access_token;
    console.log('✅ Logged in\n');

    // Get all locations, sorted by created_at
    console.log('📊 Fetching latest location...\n');
    const response = await fetch(
      `${DIRECTUS_URL}/items/map_locations?sort=-created_at&limit=1&fields=*`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch locations');
    }

    const data = await response.json();

    if (data.data.length === 0) {
      console.log('⚠️  No locations found');
      process.exit(0);
    }

    const latest = data.data[0];

    console.log('📍 Latest Location (created via UI):');
    console.log('═'.repeat(70));
    console.log(JSON.stringify(latest, null, 2));
    console.log('═'.repeat(70));

    console.log('\n🔍 Field Analysis:');
    console.log('─'.repeat(70));
    Object.keys(latest).forEach(key => {
      const value = latest[key];
      const type = typeof value;
      const isNull = value === null;
      console.log(`   ${key.padEnd(20)} : ${isNull ? 'NULL' : type.padEnd(10)} = ${isNull ? 'null' : JSON.stringify(value)}`);
    });

    console.log('\n💡 Now I will try to create with EXACT same structure...\n');

    // Try to create with same structure
    const testId = 'test-exact-format-' + Date.now();
    const testData = {
      id: testId,
      name_id: latest.name_id || 'Test',
      name_en: latest.name_en || 'Test',
      description_id: latest.description_id || 'Test',
      description_en: latest.description_en || 'Test',
      category: latest.category || 'heritage',
      subcategory: latest.subcategory,
      latitude: latest.latitude || -7.8,
      longitude: latest.longitude || 110.3,
      address_id: latest.address_id || 'Test',
      address_en: latest.address_en || 'Test',
      google_maps_url: latest.google_maps_url,
      image: latest.image,
      opening_hours_id: latest.opening_hours_id,
      opening_hours_en: latest.opening_hours_en,
      ticket_price_id: latest.ticket_price_id,
      ticket_price_en: latest.ticket_price_en,
      facilities: latest.facilities,
      phone: latest.phone,
      email: latest.email,
      whatsapp: latest.whatsapp,
      website: latest.website,
      instagram: latest.instagram,
      facebook: latest.facebook,
      status: latest.status || 'draft',
      sort: latest.sort,
    };

    console.log('🧪 Test data to create:');
    console.log(JSON.stringify(testData, null, 2));

    const createResponse = await fetch(`${DIRECTUS_URL}/items/map_locations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    console.log('\n📤 Create Response Status:', createResponse.status);

    if (createResponse.ok) {
      const createResult = await createResponse.json();
      console.log('✅ CREATE WORKS with exact format!!!');
      console.log('   Created ID:', createResult.data.id);

      // Delete test
      await fetch(`${DIRECTUS_URL}/items/map_locations/${testId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      console.log('   🗑️  Test item deleted');

      console.log('\n🎉 SUCCESS! Now we know the correct format!');
      console.log('   Ready to import all data with correct format');
    } else {
      const errorData = await createResponse.json();
      console.log('❌ CREATE still fails with exact format:');
      console.log(JSON.stringify(errorData, null, 2));
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

readLatestLocation();
