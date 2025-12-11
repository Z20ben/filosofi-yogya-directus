/**
 * Fix Optional Fields - Make Contact Fields Optional
 *
 * Sets email, phone, whatsapp, and other contact fields as optional
 * since not all locations will have complete contact information
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

async function makeFieldOptional(collection, field) {
  try {
    await directusRequest(`/fields/${collection}/${field}`, {
      method: 'PATCH',
      body: JSON.stringify({
        schema: {
          is_nullable: true,
        },
        meta: {
          required: false,
        },
      }),
    });
    console.log(`   ✅ ${field} → optional`);
  } catch (error) {
    console.error(`   ⚠️  Could not update ${field}:`, error.message);
  }
}

async function fixOptionalFields() {
  try {
    await login();

    console.log('🔧 Making Contact Fields Optional...\n');

    // Contact fields that should be optional
    const optionalFields = [
      'email',
      'phone',
      'whatsapp',
      'website',
      'instagram',
      'facebook',
      'opening_hours_id',
      'opening_hours_en',
      'ticket_price_id',
      'ticket_price_en',
      'facilities',
      'subcategory',
    ];

    for (const field of optionalFields) {
      await makeFieldOptional('map_locations', field);
    }

    console.log('\n✅ All contact fields are now optional!');
    console.log('\n📝 Fields Updated:');
    console.log('   • email, phone, whatsapp - contact info');
    console.log('   • website, instagram, facebook - social media');
    console.log('   • opening_hours, ticket_price - operational info');
    console.log('   • facilities, subcategory - additional info');
    console.log('\n🔄 Next: Re-run the import script');
    console.log('   node scripts/auto-import-locations.js');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixOptionalFields();
