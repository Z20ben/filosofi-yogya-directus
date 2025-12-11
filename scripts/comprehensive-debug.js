/**
 * Comprehensive Permissions Debugging
 *
 * Checks EVERYTHING to find the root cause
 */

import 'dotenv/config';

const DIRECTUS_URL = process.env.PUBLIC_URL || 'http://localhost:8055';

async function comprehensiveDebug() {
  try {
    console.log('🔍 COMPREHENSIVE PERMISSIONS DEBUG\n');
    console.log('═'.repeat(70));

    // Step 1: Fresh login
    console.log('\n1️⃣  AUTHENTICATION');
    console.log('─'.repeat(70));

    const loginResponse = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      }),
    });

    if (!loginResponse.ok) {
      throw new Error('Login failed');
    }

    const loginData = await loginResponse.json();
    const token = loginData.data.access_token;
    console.log('✅ Login successful');
    console.log('   Token:', token.substring(0, 20) + '...');

    // Step 2: Get complete user info including policies
    console.log('\n2️⃣  USER & ROLE INFORMATION');
    console.log('─'.repeat(70));

    const meResponse = await fetch(`${DIRECTUS_URL}/users/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const meData = await meResponse.json();

    console.log('   Email:', meData.data.email);
    console.log('   User ID:', meData.data.id);
    console.log('   Role:', meData.data.role);

    // Step 3: Get role details via API
    console.log('\n3️⃣  ROLE DETAILS (via API)');
    console.log('─'.repeat(70));

    const roleResponse = await fetch(`${DIRECTUS_URL}/roles/${meData.data.role}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const roleData = await roleResponse.json();

    console.log('   Role Name:', roleData.data.name);
    console.log('   Role ID:', roleData.data.id);
    console.log('   Icon:', roleData.data.icon);
    console.log('   Description:', roleData.data.description);

    // Step 4: Get policies via API
    console.log('\n4️⃣  POLICIES (via API)');
    console.log('─'.repeat(70));

    const policiesResponse = await fetch(`${DIRECTUS_URL}/policies`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (policiesResponse.ok) {
      const policiesData = await policiesResponse.json();
      console.log(`   Found ${policiesData.data.length} policies:`);
      policiesData.data.forEach(policy => {
        console.log(`\n   Policy: ${policy.name}`);
        console.log(`   - ID: ${policy.id}`);
        console.log(`   - admin_access: ${policy.admin_access}`);
        console.log(`   - app_access: ${policy.app_access}`);
      });
    } else {
      console.log('   ⚠️  Cannot access policies via API');
    }

    // Step 5: Get access (role-policy mapping) via API
    console.log('\n5️⃣  ACCESS (Role-Policy Mapping)');
    console.log('─'.repeat(70));

    const accessResponse = await fetch(`${DIRECTUS_URL}/access`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (accessResponse.ok) {
      const accessData = await accessResponse.json();
      console.log(`   Found ${accessData.data.length} access mappings:`);
      accessData.data.forEach(access => {
        console.log(`\n   Access ID: ${access.id}`);
        console.log(`   - Role: ${access.role}`);
        console.log(`   - User: ${access.user}`);
        console.log(`   - Policy: ${access.policy}`);
      });
    } else {
      console.log('   ⚠️  Cannot access via API');
    }

    // Step 6: Get permissions for map_locations via API
    console.log('\n6️⃣  PERMISSIONS FOR map_locations (via API)');
    console.log('─'.repeat(70));

    const permsResponse = await fetch(
      `${DIRECTUS_URL}/permissions?filter[collection][_eq]=map_locations`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (permsResponse.ok) {
      const permsData = await permsResponse.json();
      if (permsData.data.length === 0) {
        console.log('   ⚠️  NO PERMISSIONS FOUND via API!');
        console.log('   💡 This might be the issue - permissions exist in DB but not exposed via API');
      } else {
        console.log(`   Found ${permsData.data.length} permissions:`);
        permsData.data.forEach(perm => {
          console.log(`\n   Permission ID: ${perm.id}`);
          console.log(`   - Collection: ${perm.collection}`);
          console.log(`   - Action: ${perm.action}`);
          console.log(`   - Policy: ${perm.policy}`);
          console.log(`   - Fields: ${perm.fields}`);
          console.log(`   - Permissions: ${JSON.stringify(perm.permissions)}`);
        });
      }
    } else {
      const errorData = await permsResponse.json();
      console.log('   ❌ Cannot access permissions via API');
      console.log('   Error:', errorData);
    }

    // Step 7: Check collection metadata
    console.log('\n7️⃣  COLLECTION METADATA');
    console.log('─'.repeat(70));

    const collectionResponse = await fetch(`${DIRECTUS_URL}/collections/map_locations`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (collectionResponse.ok) {
      const collectionData = await collectionResponse.json();
      console.log('   Collection:', collectionData.data.collection);
      console.log('   Meta:', JSON.stringify(collectionData.data.meta, null, 2));
    } else {
      console.log('   ⚠️  Cannot access collection metadata');
    }

    // Step 8: Try READ operation
    console.log('\n8️⃣  TEST READ OPERATION');
    console.log('─'.repeat(70));

    const readResponse = await fetch(`${DIRECTUS_URL}/items/map_locations?limit=1`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (readResponse.ok) {
      const readData = await readResponse.json();
      console.log(`   ✅ READ works! Found ${readData.data.length} items`);
    } else {
      console.log('   ❌ READ fails!');
    }

    // Step 9: Try CREATE operation with minimal data
    console.log('\n9️⃣  TEST CREATE OPERATION');
    console.log('─'.repeat(70));

    const testId = 'test-' + Date.now();
    const createResponse = await fetch(`${DIRECTUS_URL}/items/map_locations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: testId,
        name_id: 'Test',
        name_en: 'Test',
        description_id: 'Test',
        description_en: 'Test',
        category: 'heritage',
        latitude: -7.8,
        longitude: 110.3,
        address_id: 'Test',
        address_en: 'Test',
        status: 'draft',
      }),
    });

    console.log('   Status:', createResponse.status);

    if (createResponse.ok) {
      const createData = await createResponse.json();
      console.log('   ✅ CREATE WORKS!!!');
      console.log('   Created ID:', createData.data.id);

      // Clean up
      await fetch(`${DIRECTUS_URL}/items/map_locations/${testId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      console.log('   🗑️  Test item deleted');
    } else {
      const errorData = await createResponse.json();
      console.log('   ❌ CREATE FAILS!');
      console.log('   Error:', JSON.stringify(errorData, null, 2));

      // Additional debugging for CREATE failure
      console.log('\n   🔍 Additional CREATE failure analysis:');
      console.log('   - Response status:', createResponse.status);
      console.log('   - Response headers:', Object.fromEntries(createResponse.headers.entries()));
    }

    // Step 10: Summary
    console.log('\n🔟 SUMMARY & RECOMMENDATIONS');
    console.log('═'.repeat(70));

    if (!createResponse.ok) {
      console.log('\n❌ CREATE operation still fails. Possible causes:\n');
      console.log('1. Permissions in DB but not loaded by Directus');
      console.log('   → Check Directus logs for permission loading errors');
      console.log('   → Try: docker logs directus (if using Docker)');
      console.log('');
      console.log('2. Policy-based permissions require specific format');
      console.log('   → Permissions might need to be created via API, not direct DB');
      console.log('   → Try: Use Directus UI to manually add permissions');
      console.log('');
      console.log('3. Collection might have special restrictions');
      console.log('   → Check if collection is marked as system collection');
      console.log('   → Check collection meta settings');
      console.log('');
      console.log('4. Directus version might have bugs');
      console.log('   → Check Directus version: npx directus --version');
      console.log('   → Look for known issues in Directus GitHub');
    }

    console.log('\n═'.repeat(70));
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

comprehensiveDebug();
