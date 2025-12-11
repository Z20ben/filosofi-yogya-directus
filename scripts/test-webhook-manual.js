import fetch from 'node-fetch';

console.log('🧪 Testing Webhook Server...\n');

// Test payload
const testPayload = {
  collection: 'map_locations',
  key: 1, // Test dengan ID yang sudah ada
  event: 'items.update',
  payload: {
    name: 'Candi Borobudur',
    description: 'Candi Buddha terbesar di dunia dengan arsitektur yang megah',
    address: 'Jl. Badrawati, Borobudur, Magelang',
    opening_hours: '06:00 - 17:00',
    ticket_price: 'Lokal: Rp 50.000, Asing: Rp 400.000'
  }
};

console.log('Sending test webhook...');
console.log('Collection:', testPayload.collection);
console.log('Item ID:', testPayload.key);
console.log('\n');

try {
  const response = await fetch('http://localhost:8001/webhook/auto-translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testPayload)
  });

  console.log('Response Status:', response.status);

  const data = await response.json();
  console.log('Response Data:', JSON.stringify(data, null, 2));

  if (data.success) {
    console.log('\n✅ Webhook test successful!');
    console.log('   Check map_locations_translations for ID 1');
  } else {
    console.log('\n❌ Webhook test failed');
    console.log('   Error:', data.error);
  }
} catch (error) {
  console.log('\n❌ Error calling webhook:');
  console.log('   ', error.message);
  console.log('\n   Is webhook server running?');
  console.log('   Run: node scripts/webhook-auto-translate-server.js');
}
