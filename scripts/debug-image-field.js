/**
 * Debug Image Field Configuration
 * Check current field setup and identify issues
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
}

async function debug() {
  try {
    await login();
    console.log('🔍 Debugging map_locations.image field...\n');

    // Check field configuration
    const fieldData = await directusRequest('/fields/map_locations/image');
    console.log('📋 Current Field Configuration:');
    console.log(JSON.stringify(fieldData.data, null, 2));

    console.log('\n🔗 Checking Relations...');
    const relations = await directusRequest('/relations');
    const imageRelation = relations.data.find(r =>
      r.collection === 'map_locations' && r.field === 'image'
    );

    if (imageRelation) {
      console.log('✅ Relation exists:');
      console.log(JSON.stringify(imageRelation, null, 2));
    } else {
      console.log('❌ NO RELATION FOUND - This is the problem!');
      console.log('   Image field exists but relation to directus_files is missing.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debug();
