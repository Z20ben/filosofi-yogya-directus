import fetch from 'node-fetch';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.PUBLIC_URL || 'http://localhost:8055';
const { Client } = pg;
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

async function directusRequest(endpoint) {
  const url = `${DIRECTUS_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  return response.json();
}

async function diagnose() {
  console.log('🔍 Diagnosing Translations Configuration...\n');

  await login();

  const dbClient = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await dbClient.connect();

    // Check field metadata in directus_fields
    console.log('1️⃣ Checking field metadata in database...\n');

    const fieldsMetadata = await dbClient.query(`
      SELECT field, special, options
      FROM directus_fields
      WHERE collection = 'map_locations'
        AND field IN ('name', 'description', 'address', 'opening_hours', 'ticket_price', 'translations')
      ORDER BY field;
    `);

    fieldsMetadata.rows.forEach(row => {
      console.log(`   Field: ${row.field}`);
      console.log(`     special: ${row.special}`);
      console.log(`     options: ${row.options ? JSON.stringify(row.options).substring(0, 100) : 'null'}`);
      console.log();
    });

    // Check relations
    console.log('2️⃣ Checking relations...\n');

    const relations = await dbClient.query(`
      SELECT many_collection, many_field, one_collection, one_field
      FROM directus_relations
      WHERE many_collection = 'map_locations_translations';
    `);

    if (relations.rows.length > 0) {
      console.log('   Relations found:');
      relations.rows.forEach(row => {
        console.log(`   - ${row.many_collection}.${row.many_field} → ${row.one_collection}.${row.one_field || 'null'}`);
      });
    } else {
      console.log('   ❌ No relations found!');
    }

    // Check translations table data
    console.log('\n3️⃣ Checking translations table data...\n');

    const transData = await dbClient.query(`
      SELECT map_locations_id, languages_code, name, LEFT(description, 50) as description_preview
      FROM map_locations_translations
      LIMIT 3;
    `);

    if (transData.rows.length > 0) {
      console.log('   Sample translations:');
      transData.rows.forEach(row => {
        console.log(`   - ${row.map_locations_id} (${row.languages_code}): ${row.name}`);
      });
    } else {
      console.log('   ❌ No translations found!');
    }

    // Check main table single fields
    console.log('\n4️⃣ Checking main table single fields...\n');

    const mainData = await dbClient.query(`
      SELECT id, name, LEFT(description, 30) as description_preview
      FROM map_locations
      LIMIT 3;
    `);

    if (mainData.rows.length > 0) {
      console.log('   Sample main table data:');
      mainData.rows.forEach(row => {
        console.log(`   - ${row.id}: ${row.name}`);
      });
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await dbClient.end();
  }

  // Check API response
  console.log('\n5️⃣ Checking raw API response...\n');

  try {
    const apiData = await directusRequest('/items/map_locations/keraton-yogyakarta?fields=id,name,description,translations');
    console.log('   API response:');
    console.log(JSON.stringify(apiData.data, null, 2));
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  console.log('\n✅ Diagnosis complete!');
}

diagnose().catch(console.error);
