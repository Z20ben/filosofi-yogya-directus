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

  if (response.status === 204) {
    return { status: 204, data: null };
  }

  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

const collections = [
  {
    collection: 'destinasi_wisata',
    icon: 'place',
    note: 'Tourist Destinations',
    display_template: '{{name}}'
  },
  {
    collection: 'agenda_events',
    icon: 'event',
    note: 'Events and Agenda',
    display_template: '{{title}}'
  },
  {
    collection: 'umkm_lokal',
    icon: 'store',
    note: 'Local Businesses (UMKM)',
    display_template: '{{name}}'
  },
  {
    collection: 'spot_nongkrong',
    icon: 'local_cafe',
    note: 'Hangout Spots',
    display_template: '{{name}}'
  },
  {
    collection: 'trending_articles',
    icon: 'article',
    note: 'Trending Articles',
    display_template: '{{title}}'
  },
  {
    collection: 'encyclopedia_entries',
    icon: 'menu_book',
    note: 'Encyclopedia Entries',
    display_template: '{{title}}'
  }
];

async function registerCollections() {
  console.log('📝 Registering Collections in Directus...\n');

  await login();

  // Check existing collections
  console.log('1️⃣ Checking existing collections...\n');

  const existingResult = await directusRequest('/collections');
  const existingCollections = existingResult.data?.data?.map(c => c.collection) || [];

  console.log('   Existing collections:', existingCollections.join(', '));
  console.log();

  // Register each collection
  console.log('2️⃣ Registering collections...\n');

  for (const config of collections) {
    console.log(`   Registering ${config.collection}...`);

    if (existingCollections.includes(config.collection)) {
      console.log(`      ⏭️  Already registered`);
      continue;
    }

    const result = await directusRequest('/collections', {
      method: 'POST',
      body: JSON.stringify({
        collection: config.collection,
        meta: {
          icon: config.icon,
          note: config.note,
          display_template: config.display_template,
          hidden: false,
          singleton: false,
          translations: [
            { language: 'id-ID', translation: config.collection.replace(/_/g, ' ') },
            { language: 'en-US', translation: config.note }
          ]
        }
      })
    });

    if (result.status === 200 || result.status === 201) {
      console.log(`      ✅ Registered successfully`);
    } else {
      console.log(`      ❌ Failed: ${result.status}`);
      if (result.data.errors) {
        console.log(`         Error: ${result.data.errors[0]?.message}`);
      }
    }
  }

  // Register translations collections
  console.log('\n3️⃣ Registering translations collections...\n');

  const translationsCollections = collections.map(c => `${c.collection}_translations`);

  for (const collection of translationsCollections) {
    console.log(`   Registering ${collection}...`);

    if (existingCollections.includes(collection)) {
      console.log(`      ⏭️  Already registered`);
      continue;
    }

    const result = await directusRequest('/collections', {
      method: 'POST',
      body: JSON.stringify({
        collection: collection,
        meta: {
          icon: 'translate',
          hidden: true
        }
      })
    });

    if (result.status === 200 || result.status === 201) {
      console.log(`      ✅ Registered`);
    } else {
      console.log(`      ⏭️  Skipped (status ${result.status})`);
    }
  }

  // Verify
  console.log('\n4️⃣ Verifying registration...\n');

  const verifyResult = await directusRequest('/collections');
  const currentCollections = verifyResult.data?.data?.map(c => c.collection) || [];

  console.log('   Collections now visible:');
  currentCollections
    .filter(c => !c.startsWith('directus_'))
    .forEach(c => console.log(`      - ${c}`));

  console.log('\n✅ Registration complete!');
  console.log('\n📋 Next: Hard refresh browser and check Data Studio');
}

registerCollections().catch(console.error);
