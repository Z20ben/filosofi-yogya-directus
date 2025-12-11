import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.PUBLIC_URL || 'http://localhost:8055';
let accessToken = null;

async function login() {
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
}

async function directusRequest(endpoint, options = {}) {
  const url = `${DIRECTUS_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  return { status: response.status, data };
}

async function createSingleFields() {
  console.log('📝 Creating Single Translatable Fields...\n');

  await login();
  console.log('✅ Authenticated\n');

  // Fields to create
  const fields = [
    {
      field: 'name',
      type: 'string',
      schema: { max_length: 255, is_nullable: true },
      meta: {
        interface: 'input',
        options: { trim: true },
        width: 'full',
        note: 'Indonesian content (default language)',
        translations: [
          { language: 'id-ID', translation: 'Nama' },
          { language: 'en-US', translation: 'Name' }
        ]
      }
    },
    {
      field: 'description',
      type: 'text',
      schema: { is_nullable: true },
      meta: {
        interface: 'input-rich-text-html',
        width: 'full',
        note: 'Indonesian content (default language)',
        translations: [
          { language: 'id-ID', translation: 'Deskripsi' },
          { language: 'en-US', translation: 'Description' }
        ]
      }
    },
    {
      field: 'address',
      type: 'string',
      schema: { max_length: 500, is_nullable: true },
      meta: {
        interface: 'input',
        width: 'full',
        note: 'Indonesian content (default language)',
        translations: [
          { language: 'id-ID', translation: 'Alamat' },
          { language: 'en-US', translation: 'Address' }
        ]
      }
    },
    {
      field: 'opening_hours',
      type: 'string',
      schema: { max_length: 255, is_nullable: true },
      meta: {
        interface: 'input',
        width: 'half',
        note: 'Indonesian content (default language)',
        translations: [
          { language: 'id-ID', translation: 'Jam Buka' },
          { language: 'en-US', translation: 'Opening Hours' }
        ]
      }
    },
    {
      field: 'ticket_price',
      type: 'string',
      schema: { max_length: 255, is_nullable: true },
      meta: {
        interface: 'input',
        width: 'half',
        note: 'Indonesian content (default language)',
        translations: [
          { language: 'id-ID', translation: 'Harga Tiket' },
          { language: 'en-US', translation: 'Ticket Price' }
        ]
      }
    }
  ];

  console.log('1️⃣ Creating new single fields...\n');

  for (const fieldDef of fields) {
    try {
      console.log(`   Creating: ${fieldDef.field}...`);

      const result = await directusRequest('/fields/map_locations', {
        method: 'POST',
        body: JSON.stringify(fieldDef)
      });

      if (result.status === 200 || result.status === 201) {
        console.log(`   ✅ ${fieldDef.field} created`);
      } else if (result.status === 400 && result.data.errors?.[0]?.extensions?.code === 'RECORD_NOT_UNIQUE') {
        console.log(`   ⏭️  ${fieldDef.field} already exists`);
      } else {
        console.log(`   ⚠️  ${fieldDef.field} - Status ${result.status}:`, result.data.errors?.[0]?.message);
      }

    } catch (error) {
      console.log(`   ❌ ${fieldDef.field} error:`, error.message);
    }
  }

  console.log('\n✅ Fields creation complete!');
  console.log('\n📋 Next step:');
  console.log('   Populate these fields with Indonesian content (_id fields)');
  console.log('   Run: node scripts/populate-single-fields.js');
}

createSingleFields().catch(console.error);
