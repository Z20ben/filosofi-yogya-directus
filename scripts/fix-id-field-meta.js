/**
 * Fix ID Field Metadata - Make it visible and editable
 *
 * After changing to VARCHAR, the id field should be:
 * - Visible in create/edit forms
 * - Editable (not readonly)
 * - Required
 */

import 'dotenv/config';

const DIRECTUS_URL = process.env.PUBLIC_URL || 'http://localhost:8055';

async function fixIdFieldMeta() {
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

    // Get current id field metadata
    console.log('📊 Current id field metadata:');
    const getResponse = await fetch(`${DIRECTUS_URL}/fields/map_locations/id`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (getResponse.ok) {
      const currentData = await getResponse.json();
      console.log(JSON.stringify(currentData.data, null, 2));
    }

    // Update id field metadata
    console.log('\n🔧 Updating id field metadata...');

    const updateData = {
      schema: {
        is_primary_key: true,
        has_auto_increment: false, // Important!
        is_nullable: false,
      },
      meta: {
        interface: 'input', // Show as text input
        special: null, // Remove any special flags
        options: {
          placeholder: 'keraton-yogyakarta',
          iconLeft: 'vpn_key',
          slug: true,
        },
        readonly: false, // Make editable
        hidden: false, // Make visible
        required: true, // Make required
        note: 'Unique identifier (slug format: lowercase-with-dashes)',
        sort: 1, // First field
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
      console.log('✅ ID field metadata updated!\n');

      // Verify
      const verifyResponse = await fetch(`${DIRECTUS_URL}/fields/map_locations/id`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        console.log('📊 Updated metadata:');
        console.log('   Interface:', verifyData.data.meta.interface);
        console.log('   Readonly:', verifyData.data.meta.readonly);
        console.log('   Hidden:', verifyData.data.meta.hidden);
        console.log('   Required:', verifyData.data.meta.required);
        console.log('   Auto-increment:', verifyData.data.schema.has_auto_increment);
      }

      console.log('\n✅ ID field is now editable in UI!');
      console.log('\n🔄 Next steps:');
      console.log('   1. Hard refresh browser (Ctrl+Shift+R)');
      console.log('   2. Go to Map Locations → Create Item');
      console.log('   3. You should see ID field at the top');
      console.log('   4. Try creating with custom ID like "test-location"');

    } else {
      const errorData = await updateResponse.json();
      console.log('❌ Failed to update field metadata:');
      console.log(JSON.stringify(errorData, null, 2));
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixIdFieldMeta();
