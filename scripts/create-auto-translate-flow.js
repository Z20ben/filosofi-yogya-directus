import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.PUBLIC_URL || 'http://localhost:8055';
const LIBRETRANSLATE_URL = 'http://localhost:5000';

let accessToken = null;

async function login() {
  console.log('🔐 Authenticating to Directus...');
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
  console.log('✅ Authenticated\n');
}

async function directusRequest(endpoint, options = {}) {
  const url = `${DIRECTUS_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(error)}`);
  }

  return response.json();
}

async function testLibreTranslate() {
  console.log('🧪 Testing LibreTranslate...');

  try {
    const response = await fetch(`${LIBRETRANSLATE_URL}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: 'Selamat datang di Yogyakarta',
        source: 'id',
        target: 'en',
      }),
    });

    if (!response.ok) {
      throw new Error(`LibreTranslate is not running on ${LIBRETRANSLATE_URL}`);
    }

    const data = await response.json();
    console.log(`   Original: "Selamat datang di Yogyakarta"`);
    console.log(`   Translated: "${data.translatedText}"`);
    console.log('✅ LibreTranslate is working!\n');
    return true;
  } catch (error) {
    console.log('❌ LibreTranslate is not accessible!');
    console.log(`   Error: ${error.message}`);
    console.log('\n   Please start LibreTranslate first:');
    console.log('   docker run -d -p 5000:5000 -e LT_LOAD_ONLY=id,en libretranslate/libretranslate\n');
    return false;
  }
}

async function createAutoTranslateFlow() {
  console.log('📝 Creating Auto-Translate Flow in Directus...\n');

  await login();

  // Test LibreTranslate first
  const isLibreTranslateReady = await testLibreTranslate();
  if (!isLibreTranslateReady) {
    console.log('⚠️  Skipping flow creation until LibreTranslate is ready');
    return;
  }

  // Define collections and their translatable fields
  const collections = {
    'map_locations': ['name', 'description', 'address', 'opening_hours', 'ticket_price'],
    'destinasi_wisata': ['name', 'location', 'description', 'hours'],
    'agenda_events': ['title', 'description', 'location', 'organizer'],
    'umkm_lokal': ['name', 'description', 'address', 'category'],
    'spot_nongkrong': ['name', 'description', 'address'],
    'trending_articles': ['title', 'excerpt', 'content', 'author'],
    'encyclopedia_entries': ['title', 'content', 'summary'],
  };

  // Create one flow per collection
  for (const [collection, fields] of Object.entries(collections)) {
    console.log(`\n📦 Creating flow for: ${collection}`);
    console.log(`   Translatable fields: ${fields.join(', ')}`);

    try {
      // Create the flow
      const flowData = {
        name: `Auto-Translate ${collection}`,
        icon: 'translate',
        color: '#2ECDA7',
        description: `Automatically translate ${collection} content from Indonesian to English using LibreTranslate`,
        status: 'active',
        trigger: 'event',
        accountability: 'all',
        options: {
          type: 'action',
          scope: ['items.create', 'items.update'],
          collections: [collection],
        },
      };

      const flowResponse = await directusRequest('/flows', {
        method: 'POST',
        body: JSON.stringify(flowData),
      });

      const flowId = flowResponse.data.id;
      console.log(`   ✅ Flow created: ${flowId}`);

      // Create operations for this flow
      // We'll use a simpler approach: one operation that calls a script

      // Operation 1: Webhook to custom endpoint that handles translation
      const webhookOp = {
        flow: flowId,
        name: 'Trigger Translation Script',
        key: 'webhook_trigger',
        type: 'request',
        position_x: 5,
        position_y: 5,
        options: {
          method: 'POST',
          url: `${DIRECTUS_URL}/flows/trigger/${flowId}`,
          body: JSON.stringify({
            collection: '{{$trigger.collection}}',
            key: '{{$trigger.key}}',
            payload: '{{$trigger.payload}}',
          }),
        },
      };

      const opResponse = await directusRequest('/operations', {
        method: 'POST',
        body: JSON.stringify(webhookOp),
      });

      console.log(`   ✅ Operation created`);

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n✅ All flows created!\n');
  console.log('📋 Next steps:');
  console.log('   1. Go to Directus UI → Settings → Flows');
  console.log('   2. You will see 7 new flows (one per collection)');
  console.log('   3. Test by creating new content in Indonesian');
  console.log('   4. Check if English translation auto-created\n');
}

// Note: Directus Flows via UI is more reliable than API
// This script creates basic flows, but manual configuration recommended
console.log('⚠️  NOTE: Creating Directus Flows via API is complex.');
console.log('   I recommend creating the flow manually via Directus UI.\n');
console.log('   But let me test LibreTranslate first...\n');

testLibreTranslate().then(isReady => {
  if (isReady) {
    console.log('\n📋 LibreTranslate is ready!');
    console.log('\nNext: Create Directus Flow manually in UI:');
    console.log('   1. Settings → Flows → Create Flow');
    console.log('   2. Name: "Auto-Translate map_locations"');
    console.log('   3. Trigger: Event Hook');
    console.log('   4. Collections: map_locations');
    console.log('   5. Actions: items.create, items.update');
    console.log('\n   Or run: node scripts/create-flow-manual-guide.js');
  }
});
