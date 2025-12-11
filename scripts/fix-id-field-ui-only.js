/**
 * Fix ID Field UI Metadata Only
 *
 * Make id field visible and editable in UI without changing schema
 */

import 'dotenv/config';

const DIRECTUS_URL = process.env.PUBLIC_URL || 'http://localhost:8055';

async function fixIdFieldUI() {
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

    // Update ONLY meta (UI settings), NOT schema
    console.log('🔧 Updating id field UI settings...');

    const updateData = {
      meta: {
        interface: 'input', // Text input instead of numeric
        special: null,
        options: {
          placeholder: 'keraton-yogyakarta',
          iconLeft: 'vpn_key',
          slug: true,
          trim: true,
        },
        readonly: false, // Make editable
        hidden: false, // Make visible
        required: true, // Make required
        note: 'Unique identifier (format: lowercase-with-dashes)',
        sort: 1,
        width: 'full',
      },
    };

    const updateResponse = await fetch(`${DIRECTUS_URL}/fields/map_locations/id`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (updateResponse.ok) {
      console.log('✅ ID field UI updated!\n');

      // Verify
      const verifyResponse = await fetch(`${DIRECTUS_URL}/fields/map_locations/id`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        console.log('📊 Current settings:');
        console.log('   Interface:', verifyData.data.meta.interface);
        console.log('   Readonly:', verifyData.data.meta.readonly);
        console.log('   Hidden:', verifyData.data.meta.hidden);
        console.log('   Required:', verifyData.data.meta.required);
      }

      console.log('\n🎉 SUCCESS! ID field is now visible and editable!');
      console.log('\n🔄 Next steps:');
      console.log('   1. Hard refresh browser (Ctrl+Shift+R)');
      console.log('   2. Go to: Content → Map Locations → Create Item');
      console.log('   3. ID field should appear at the top of the form');
      console.log('   4. Test create with custom ID: "test-manual-location"');

    } else {
      const errorData = await updateResponse.json();
      console.log('❌ Failed:');
      console.log(JSON.stringify(errorData, null, 2));
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixIdFieldUI();
