import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = 'http://127.0.0.1:8055';
const LIBRETRANSLATE_URL = 'http://127.0.0.1:5000';
const WEBHOOK_URL = 'http://localhost:8001'; // Use localhost for IPv6 compatibility

let accessToken = null;
let testItemId = null;

console.log('🧪 COMPREHENSIVE AUTO-TRANSLATE TEST\n');
console.log('='.repeat(70));

// Test 1: Check LibreTranslate
async function testLibreTranslate() {
  console.log('\n1️⃣  Testing LibreTranslate...');

  try {
    const response = await fetch(`${LIBRETRANSLATE_URL}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: 'Selamat pagi',
        source: 'id',
        target: 'en',
      }),
    });

    if (!response.ok) {
      console.log('   ❌ FAILED: LibreTranslate not responding');
      console.log('   Fix: docker start libretranslate');
      return false;
    }

    const data = await response.json();
    console.log(`   ✅ SUCCESS: "Selamat pagi" → "${data.translatedText}"`);
    return true;
  } catch (error) {
    console.log('   ❌ FAILED:', error.message);
    console.log('   Fix: docker start libretranslate');
    return false;
  }
}

// Test 2: Check Webhook Server
async function testWebhookServer() {
  console.log('\n2️⃣  Testing Webhook Server...');

  try {
    const response = await fetch(`${WEBHOOK_URL}/health`);

    if (!response.ok) {
      console.log('   ❌ FAILED: Webhook server not responding');
      console.log('   Fix: node scripts/webhook-auto-translate-server.js');
      return false;
    }

    const data = await response.json();
    console.log('   ✅ SUCCESS: Webhook server running');
    console.log(`      LibreTranslate: ${data.libretranslate}`);
    console.log(`      Directus: ${data.directus}`);
    return true;
  } catch (error) {
    console.log('   ❌ FAILED:', error.message);
    console.log('   Fix: node scripts/webhook-auto-translate-server.js');
    return false;
  }
}

// Test 3: Check Directus & Login
async function testDirectus() {
  console.log('\n3️⃣  Testing Directus & Authentication...');

  try {
    const response = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      }),
    });

    if (!response.ok) {
      console.log('   ❌ FAILED: Cannot authenticate to Directus');
      console.log('   Fix: Check Directus running or .env credentials');
      return false;
    }

    const data = await response.json();
    accessToken = data.data.access_token;
    console.log('   ✅ SUCCESS: Authenticated to Directus');
    return true;
  } catch (error) {
    console.log('   ❌ FAILED:', error.message);
    console.log('   Fix: Start Directus (npm run start)');
    return false;
  }
}

// Test 4: Check Flow Configuration
async function testFlowConfig() {
  console.log('\n4️⃣  Testing Flow Configuration...');

  try {
    const response = await fetch(`${DIRECTUS_URL}/flows`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      console.log('   ❌ FAILED: Cannot fetch flows');
      return false;
    }

    const data = await response.json();
    const autoTranslateFlow = data.data.find(f => f.name.includes('Auto-Translate'));

    if (!autoTranslateFlow) {
      console.log('   ❌ FAILED: Auto-Translate flow not found');
      console.log('   Fix: Create flow in Settings → Flows');
      return false;
    }

    console.log('   ✅ SUCCESS: Flow found');
    console.log(`      Name: ${autoTranslateFlow.name}`);
    console.log(`      Status: ${autoTranslateFlow.status}`);
    console.log(`      Collections: ${autoTranslateFlow.options.collections.join(', ')}`);

    if (autoTranslateFlow.status !== 'active') {
      console.log('   ⚠️  WARNING: Flow is not active!');
      return false;
    }

    // Check operations
    const opsRes = await fetch(`${DIRECTUS_URL}/operations?filter[flow][_eq]=${autoTranslateFlow.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const opsData = await opsRes.json();

    if (opsData.data.length === 0) {
      console.log('   ❌ FAILED: Flow has no operations');
      console.log('   Fix: Add Webhook operation in flow');
      return false;
    }

    console.log(`   ✅ SUCCESS: ${opsData.data.length} operation(s) configured`);
    opsData.data.forEach(op => {
      console.log(`      - ${op.name} (${op.type}): ${op.options.url}`);
    });

    return true;
  } catch (error) {
    console.log('   ❌ FAILED:', error.message);
    return false;
  }
}

// Test 5: Manual Webhook Call
async function testWebhookManual() {
  console.log('\n5️⃣  Testing Manual Webhook Call...');

  try {
    const response = await fetch(`${WEBHOOK_URL}/webhook/auto-translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collection: 'map_locations',
        key: 1,
        event: 'items.update',
        payload: {
          name: 'Test Manual Webhook',
          description: 'Ini adalah test manual',
        }
      }),
    });

    if (!response.ok) {
      console.log('   ❌ FAILED: Webhook returned error');
      const error = await response.json();
      console.log('   Error:', error);
      return false;
    }

    const data = await response.json();

    if (data.success) {
      console.log('   ✅ SUCCESS: Webhook processed successfully');
      console.log('      Translations:', JSON.stringify(data.translations, null, 8));
      return true;
    } else {
      console.log('   ❌ FAILED:', data.error);
      return false;
    }
  } catch (error) {
    console.log('   ❌ FAILED:', error.message);
    return false;
  }
}

// Test 6: Create Real Test Item
async function testCreateItem() {
  console.log('\n6️⃣  Testing Create Item (Flow Trigger Test)...');

  try {
    const timestamp = Date.now();
    const testData = {
      slug: `test-auto-translate-${timestamp}`,
      name: 'Museum Test Otomatis',
      description: 'Ini adalah test otomatis untuk memverifikasi auto-translate berfungsi dengan baik',
      address: 'Jl. Test No. 123, Yogyakarta',
      opening_hours: '08:00 - 16:00',
      ticket_price: 'Gratis untuk testing',
      latitude: -7.7956,
      longitude: 110.3695,
      category: 'heritage',
      status: 'published'
    };

    console.log(`   Creating test item with slug: ${testData.slug}`);

    const response = await fetch(`${DIRECTUS_URL}/items/map_locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(testData)
    });

    if (!response.ok) {
      const error = await response.json();
      console.log('   ❌ FAILED: Cannot create item');
      console.log('   Error:', error);
      return false;
    }

    const data = await response.json();
    testItemId = data.data.id;

    console.log(`   ✅ SUCCESS: Item created with ID ${testItemId}`);
    console.log(`      Name: ${data.data.name}`);
    console.log(`      Slug: ${data.data.slug}`);

    return true;
  } catch (error) {
    console.log('   ❌ FAILED:', error.message);
    return false;
  }
}

// Test 7: Wait and Check Translation
async function testCheckTranslation() {
  console.log('\n7️⃣  Waiting for Auto-Translation...');
  console.log('   ⏳ Waiting 5 seconds for flow to trigger...');

  await new Promise(r => setTimeout(r, 5000));

  try {
    const response = await fetch(
      `${DIRECTUS_URL}/items/map_locations_translations?filter[map_locations_id][_eq]=${testItemId}&filter[languages_code][_eq]=en-US`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      console.log('   ❌ FAILED: Cannot check translations');
      return false;
    }

    const data = await response.json();

    if (data.data && data.data.length > 0) {
      console.log('   ✅ SUCCESS: Translation created automatically!');
      console.log('      Name (EN):', data.data[0].name);
      console.log('      Description (EN):', data.data[0].description?.substring(0, 60) + '...');
      console.log('      Address (EN):', data.data[0].address);
      console.log('\n   🎉 AUTO-TRANSLATE IS WORKING! Flow triggered successfully!');
      return true;
    } else {
      console.log('   ❌ FAILED: No translation found');
      console.log('   Flow did NOT trigger automatically');
      console.log('\n   Possible issues:');
      console.log('   - Flow not active in runtime (try restarting Directus)');
      console.log('   - Flow trigger type wrong (try Filter instead of Action)');
      console.log('   - Webhook server not receiving requests');
      console.log('\n   Check webhook server terminal for logs during item creation');
      return false;
    }
  } catch (error) {
    console.log('   ❌ FAILED:', error.message);
    return false;
  }
}

// Cleanup test item
async function cleanup() {
  if (!testItemId) return;

  console.log('\n8️⃣  Cleanup...');

  try {
    // Delete test item
    await fetch(`${DIRECTUS_URL}/items/map_locations/${testItemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    console.log(`   ✅ Test item ID ${testItemId} deleted`);
  } catch (error) {
    console.log(`   ⚠️  Could not cleanup: ${error.message}`);
  }
}

// Run all tests
async function runAllTests() {
  const results = {
    libretranslate: false,
    webhook: false,
    directus: false,
    flow: false,
    manualWebhook: false,
    createItem: false,
    autoTranslate: false,
  };

  results.libretranslate = await testLibreTranslate();
  if (!results.libretranslate) {
    console.log('\n⛔ Cannot continue without LibreTranslate');
    return;
  }

  results.webhook = await testWebhookServer();
  if (!results.webhook) {
    console.log('\n⛔ Cannot continue without Webhook Server');
    return;
  }

  results.directus = await testDirectus();
  if (!results.directus) {
    console.log('\n⛔ Cannot continue without Directus');
    return;
  }

  results.flow = await testFlowConfig();
  results.manualWebhook = await testWebhookManual();
  results.createItem = await testCreateItem();

  if (results.createItem) {
    results.autoTranslate = await testCheckTranslation();
  }

  // await cleanup();

  // Final Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 FINAL TEST RESULTS\n');

  const tests = [
    { name: 'LibreTranslate Running', result: results.libretranslate },
    { name: 'Webhook Server Running', result: results.webhook },
    { name: 'Directus Authentication', result: results.directus },
    { name: 'Flow Configuration', result: results.flow },
    { name: 'Manual Webhook Call', result: results.manualWebhook },
    { name: 'Create Test Item', result: results.createItem },
    { name: 'Auto-Translation (Flow)', result: results.autoTranslate },
  ];

  tests.forEach(test => {
    const icon = test.result ? '✅' : '❌';
    console.log(`   ${icon} ${test.name}`);
  });

  const allPassed = Object.values(results).every(r => r === true);

  console.log('\n' + '='.repeat(70));

  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED! Auto-translate is fully functional!\n');
    console.log('You can now:');
    console.log('   - Create content in Indonesian in any of the 7 collections');
    console.log('   - Translations will auto-create in English');
    console.log('   - Check *_translations tables for results\n');
  } else {
    console.log('⚠️  SOME TESTS FAILED\n');
    console.log('Review the output above to identify issues.');
    console.log('Common fixes:');
    console.log('   - LibreTranslate: docker start libretranslate');
    console.log('   - Webhook Server: node scripts/webhook-auto-translate-server.js');
    console.log('   - Directus: npm run start');
    console.log('   - Flow: Settings → Flows → Check configuration\n');
  }

  if (!results.autoTranslate && results.manualWebhook) {
    console.log('💡 NOTE: Manual webhook works but Flow did not trigger.');
    console.log('   This suggests Flow configuration issue.');
    console.log('   Try: Restart Directus or change Flow trigger to Filter type\n');
  }
}

runAllTests().catch(console.error);
