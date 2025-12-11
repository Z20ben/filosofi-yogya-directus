/**
 * Delete All Map Locations
 *
 * Clean slate before fresh import with proper slug IDs
 */

import 'dotenv/config';

const DIRECTUS_URL = process.env.PUBLIC_URL || 'http://localhost:8055';

async function deleteAllLocations() {
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

    // Get all locations
    console.log('🔍 Fetching all locations...');
    const getResponse = await fetch(`${DIRECTUS_URL}/items/map_locations?fields=id,name_id&limit=-1`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const getData = await getResponse.json();
    const locations = getData.data;

    console.log(`   Found ${locations.length} locations to delete\n`);

    if (locations.length === 0) {
      console.log('✅ No locations to delete. Table is empty.');
      process.exit(0);
    }

    // Show what will be deleted
    console.log('📋 Locations to be deleted:');
    locations.forEach(loc => {
      console.log(`   - ${loc.id} (${loc.name_id})`);
    });

    console.log('\n⚠️  WARNING: This will delete ALL locations!');
    console.log('   Proceeding in 2 seconds...\n');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Delete all
    console.log('🗑️  Deleting all locations...\n');
    let successCount = 0;
    let failCount = 0;

    for (const location of locations) {
      process.stdout.write(`   Deleting ${location.id}...`);

      const deleteResponse = await fetch(`${DIRECTUS_URL}/items/map_locations/${location.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (deleteResponse.ok || deleteResponse.status === 204) {
        successCount++;
        console.log(' ✅');
      } else {
        failCount++;
        console.log(' ❌');
      }
    }

    console.log('\n─'.repeat(60));
    console.log(`\n✅ Deletion complete!`);
    console.log(`   Deleted: ${successCount}`);
    console.log(`   Failed: ${failCount}`);

    console.log('\n🔄 Next Steps:');
    console.log('   1. Refresh Directus UI - table should be empty');
    console.log('   2. Run import script with all locations:');
    console.log('      node scripts/auto-import-locations.js');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deleteAllLocations();
