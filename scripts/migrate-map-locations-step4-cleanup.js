import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.PUBLIC_URL || 'http://localhost:8055';
let accessToken = null;

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

async function cleanup() {
  console.log('🧹 Cleaning up old _id/_en fields...\n');
  console.log('⚠️  WARNING: This will permanently delete old fields!');
  console.log('   Make sure migration is verified before proceeding.\n');

  await login();

  // Fields to delete
  const fieldsToDelete = [
    'name_id',
    'name_en',
    'description_id',
    'description_en',
    'address_id',
    'address_en',
    'opening_hours_id',
    'opening_hours_en',
    'ticket_price_id',
    'ticket_price_en'
  ];

  console.log('📋 Fields to delete:');
  fieldsToDelete.forEach(f => console.log(`   - ${f}`));
  console.log();

  let successCount = 0;
  let errorCount = 0;

  for (const field of fieldsToDelete) {
    try {
      console.log(`   Deleting ${field}...`);

      await directusRequest(`/fields/map_locations/${field}`, {
        method: 'DELETE'
      });

      console.log(`   ✅ ${field} deleted`);
      successCount++;

    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        console.log(`   ⏭️  ${field} already deleted or doesn't exist`);
      } else {
        console.log(`   ❌ ${field} failed: ${error.message}`);
        errorCount++;
      }
    }
  }

  console.log('\n📊 Cleanup Summary:');
  console.log(`   ✅ Deleted: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📋 Total: ${fieldsToDelete.length}`);

  if (errorCount === 0) {
    console.log('\n✅ Cleanup complete!');
    console.log('\n🎉 Migration finished successfully!');
    console.log('   map_locations now uses Directus Translations.');
    console.log('\n📋 Next: Recreate other 6 collections with translations');
  } else {
    console.log('\n⚠️  Some fields could not be deleted.');
    console.log('   You may need to delete them manually via Directus UI.');
  }
}

cleanup().catch(console.error);
