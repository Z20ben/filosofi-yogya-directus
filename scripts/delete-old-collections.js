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

  // For DELETE, 204 No Content is success
  if (response.status === 204) {
    return { status: 204, data: null };
  }

  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function deleteOldCollections() {
  console.log('🗑️  Deleting Old Collections...\n');
  console.log('⚠️  These collections will be deleted and recreated with translations:\n');

  await login();

  // Collections to delete (they have old _id/_en structure)
  const collectionsToDelete = [
    'agenda_events',
    'destinasi_wisata',
    'encyclopedia_entries',
    'spot_nongkrong',
    'trending_articles',
    'umkm_lokal'
  ];

  console.log('📋 Collections to delete:');
  collectionsToDelete.forEach(c => console.log(`   - ${c}`));
  console.log();

  // Check current state
  console.log('1️⃣ Checking current collections...\n');

  for (const collection of collectionsToDelete) {
    try {
      const result = await directusRequest(`/items/${collection}?limit=1`);

      if (result.status === 200) {
        const count = result.data.data?.length || 0;
        console.log(`   ✅ ${collection} - exists (records: ${count})`);
      } else {
        console.log(`   ⏭️  ${collection} - not found`);
      }
    } catch (error) {
      console.log(`   ⏭️  ${collection} - not found`);
    }
  }

  // Delete collections
  console.log('\n2️⃣ Deleting collections...\n');

  let successCount = 0;
  let skipCount = 0;

  for (const collection of collectionsToDelete) {
    try {
      console.log(`   Deleting ${collection}...`);

      const result = await directusRequest(`/collections/${collection}`, {
        method: 'DELETE'
      });

      if (result.status === 204 || result.status === 200) {
        console.log(`   ✅ ${collection} deleted`);
        successCount++;
      } else if (result.status === 404) {
        console.log(`   ⏭️  ${collection} already deleted`);
        skipCount++;
      } else {
        console.log(`   ⚠️  ${collection} - Status ${result.status}`);
      }

    } catch (error) {
      console.log(`   ❌ ${collection} error: ${error.message}`);
    }
  }

  // Verify deletion
  console.log('\n3️⃣ Verifying deletion...\n');

  for (const collection of collectionsToDelete) {
    try {
      const result = await directusRequest(`/collections/${collection}`);

      if (result.status === 404) {
        console.log(`   ✅ ${collection} - confirmed deleted`);
      } else {
        console.log(`   ⚠️  ${collection} - still exists`);
      }
    } catch (error) {
      console.log(`   ✅ ${collection} - confirmed deleted`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Deleted: ${successCount}`);
  console.log(`   ⏭️  Skipped: ${skipCount}`);
  console.log(`   📋 Total: ${collectionsToDelete.length}`);

  console.log('\n✅ Deletion complete!');
  console.log('\n📋 Next: Create collections with translations structure');
}

deleteOldCollections().catch(console.error);
