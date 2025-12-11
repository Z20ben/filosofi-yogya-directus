/**
 * Remove Email Field Validation
 *
 * Completely removes validation requirement from email field
 */

import 'dotenv/config';

const DIRECTUS_URL = process.env.PUBLIC_URL || 'http://localhost:8055';
let accessToken = null;

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

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`HTTP ${response.status}: ${error.message || JSON.stringify(error)}`);
  }

  return response.json();
}

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
    throw new Error(`Login failed: ${response.statusText}`);
  }

  const data = await response.json();
  accessToken = data.data.access_token;
  console.log('✅ Authenticated successfully\n');
}

async function removeEmailValidation() {
  try {
    await login();

    console.log('🔧 Removing email validation...\n');

    // Get current field config
    const currentField = await directusRequest('/fields/map_locations/email');
    console.log('Current email field config:', JSON.stringify(currentField.data, null, 2));

    // Update field to remove all validation
    await directusRequest('/fields/map_locations/email', {
      method: 'PATCH',
      body: JSON.stringify({
        schema: {
          is_nullable: true,
          default_value: null,
        },
        meta: {
          required: false,
          validation: null,
          validation_message: null,
        },
      }),
    });

    console.log('\n✅ Email validation removed!');
    console.log('\n🔄 Next: Restart Directus and re-run import');
    console.log('   node scripts/auto-import-locations.js');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

removeEmailValidation();
