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

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`Login failed: ${error.message || JSON.stringify(error)}`);
  }

  const data = await response.json();
  accessToken = data.data.access_token;
  console.log('✅ Authentication successful\n');
}

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

  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function setupLanguages() {
  console.log('🌍 Setting up Directus Languages...\n');

  // Login first
  await login();

  // Languages to create
  const languages = [
    {
      code: 'id-ID',
      name: 'Indonesian',
      direction: 'ltr'
    },
    {
      code: 'en-US',
      name: 'English',
      direction: 'ltr'
    }
  ];

  // Check if languages collection is accessible
  console.log('1️⃣ Checking languages access...');
  const checkResult = await directusRequest('/items/directus_languages');

  if (checkResult.status === 403) {
    console.log('❌ No access to languages collection');
    console.log('📋 Please enable translations in Directus:');
    console.log('   1. Go to Settings > Project Settings');
    console.log('   2. Enable "Multi-Language Content"');
    console.log('   3. Or manually create languages via database\n');

    // Try creating via direct API
    console.log('2️⃣ Attempting to create languages via API...\n');

    for (const lang of languages) {
      console.log(`Creating language: ${lang.name} (${lang.code})`);

      const createResult = await directusRequest('/items/directus_languages', {
        method: 'POST',
        body: JSON.stringify(lang)
      });

      if (createResult.status === 200 || createResult.status === 201) {
        console.log(`✅ ${lang.name} created successfully`);
      } else if (createResult.status === 403) {
        console.log(`❌ Permission denied for ${lang.name}`);
        console.log(`   Response:`, JSON.stringify(createResult.data, null, 2));
      } else {
        console.log(`⚠️  ${lang.name} - Status ${createResult.status}`);
        console.log(`   Response:`, JSON.stringify(createResult.data, null, 2));
      }
    }
  } else if (checkResult.status === 200) {
    console.log('✅ Languages collection is accessible\n');

    const existingLangs = checkResult.data.data || [];
    console.log('📋 Existing languages:', existingLangs.map(l => l.code).join(', ') || 'none');

    console.log('\n2️⃣ Creating required languages...\n');

    for (const lang of languages) {
      const exists = existingLangs.find(l => l.code === lang.code);

      if (exists) {
        console.log(`⏭️  ${lang.name} (${lang.code}) already exists`);
      } else {
        console.log(`Creating language: ${lang.name} (${lang.code})`);

        const createResult = await directusRequest('/items/directus_languages', {
          method: 'POST',
          body: JSON.stringify(lang)
        });

        if (createResult.status === 200 || createResult.status === 201) {
          console.log(`✅ ${lang.name} created successfully`);
        } else {
          console.log(`❌ Failed to create ${lang.name}`);
          console.log(`   Status: ${createResult.status}`);
          console.log(`   Response:`, JSON.stringify(createResult.data, null, 2));
        }
      }
    }
  } else {
    console.log(`❌ Unexpected status: ${checkResult.status}`);
    console.log('Response:', JSON.stringify(checkResult.data, null, 2));
  }

  console.log('\n✅ Language setup complete!');
}

setupLanguages().catch(console.error);
