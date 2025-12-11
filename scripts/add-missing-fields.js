/**
 * Add Missing Fields to Collections
 *
 * Adds important fields that were missed in initial setup:
 * - googleMapsUrl (CRITICAL for UX)
 * - subcategory
 * - email, whatsapp (contact)
 * - instagram, facebook (social media)
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

async function createField(collection, field) {
  try {
    await directusRequest(`/fields/${collection}`, {
      method: 'POST',
      body: JSON.stringify(field),
    });
    console.log(`   ✅ Added ${field.field}`);
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`   ⚠️  ${field.field} already exists, skipping...`);
    } else {
      console.error(`   ❌ Failed to add ${field.field}:`, error.message);
    }
  }
}

async function addMissingFields() {
  try {
    await login();

    console.log('➕ Adding Missing Fields to Map Locations...\n');

    // Google Maps URL (CRITICAL!)
    await createField('map_locations', {
      field: 'google_maps_url',
      type: 'string',
      meta: {
        interface: 'input',
        note: 'URL Google Maps untuk lokasi ini (contoh: https://goo.gl/maps/xyz)',
        options: {
          placeholder: 'https://goo.gl/maps/...',
          iconLeft: 'map',
        },
        width: 'full',
      },
    });

    // Subcategory
    await createField('map_locations', {
      field: 'subcategory',
      type: 'string',
      meta: {
        interface: 'input',
        note: 'Sub-kategori (contoh: palace, temple, museum, cafe)',
        options: {
          placeholder: 'palace',
        },
        width: 'half',
      },
    });

    // Email
    await createField('map_locations', {
      field: 'email',
      type: 'string',
      meta: {
        interface: 'input',
        note: 'Email kontak',
        options: {
          placeholder: 'info@example.com',
          iconLeft: 'email',
        },
        validation: {
          _and: [
            {
              email: {
                _submitted: true,
              },
            },
          ],
        },
        width: 'half',
      },
    });

    // WhatsApp
    await createField('map_locations', {
      field: 'whatsapp',
      type: 'string',
      meta: {
        interface: 'input',
        note: 'Nomor WhatsApp (format: +62xxx)',
        options: {
          placeholder: '+62812-3456-7890',
          iconLeft: 'phone',
        },
        width: 'half',
      },
    });

    // Instagram
    await createField('map_locations', {
      field: 'instagram',
      type: 'string',
      meta: {
        interface: 'input',
        note: 'Username Instagram (tanpa @)',
        options: {
          placeholder: 'keratonjogja',
          iconLeft: 'alternate_email',
        },
        width: 'half',
      },
    });

    // Facebook
    await createField('map_locations', {
      field: 'facebook',
      type: 'string',
      meta: {
        interface: 'input',
        note: 'URL Facebook page',
        options: {
          placeholder: 'https://facebook.com/page',
          iconLeft: 'link',
        },
        width: 'half',
      },
    });

    console.log('\n✅ All missing fields added!');
    console.log('\n📝 Fields Added:');
    console.log('   • google_maps_url - Critical for navigation UX');
    console.log('   • subcategory - Better categorization');
    console.log('   • email - Contact information');
    console.log('   • whatsapp - Popular contact method');
    console.log('   • instagram - Social media presence');
    console.log('   • facebook - Social media presence');
    console.log('\n🔄 Next:');
    console.log('   • Restart Directus server');
    console.log('   • Hard refresh browser');
    console.log('   • Fields will appear in Map Locations form');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addMissingFields();
