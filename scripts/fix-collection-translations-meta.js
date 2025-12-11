import pg from 'pg';
import fetch from 'node-fetch';
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

async function fixCollectionMeta() {
  console.log('🔧 Fixing Collection Translations Meta...\n');

  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();

    // Step 1: Check current collection meta
    console.log('1️⃣ Checking current collection meta...');

    const currentMeta = await client.query(`
      SELECT meta
      FROM directus_collections
      WHERE collection = 'map_locations';
    `);

    if (currentMeta.rows.length > 0) {
      console.log('   Current meta:', JSON.stringify(currentMeta.rows[0].meta, null, 2).substring(0, 200));
    }

    // Step 2: Update collection meta with translations config
    console.log('\n2️⃣ Updating collection meta with translations...');

    const translationsMeta = {
      translations: [
        {
          language: 'id-ID',
          translation: 'Lokasi Peta',
          singular: 'Lokasi',
          plural: 'Lokasi'
        },
        {
          language: 'en-US',
          translation: 'Map Locations',
          singular: 'Location',
          plural: 'Locations'
        }
      ]
    };

    // Merge with existing meta
    let existingMeta = currentMeta.rows.length > 0 ? currentMeta.rows[0].meta : {};
    if (typeof existingMeta === 'string') {
      existingMeta = JSON.parse(existingMeta);
    }

    const updatedMeta = {
      ...existingMeta,
      ...translationsMeta
    };

    await client.query(`
      UPDATE directus_collections
      SET meta = $1
      WHERE collection = 'map_locations';
    `, [JSON.stringify(updatedMeta)]);

    console.log('   ✅ Collection meta updated');

    // Step 3: Verify and fix relation metadata
    console.log('\n3️⃣ Checking relation metadata...');

    const relations = await client.query(`
      SELECT *
      FROM directus_relations
      WHERE many_collection = 'map_locations_translations'
        AND many_field = 'map_locations_id';
    `);

    if (relations.rows.length > 0) {
      const rel = relations.rows[0];
      console.log('   Current relation:', {
        many_field: rel.many_field,
        one_collection: rel.one_collection,
        one_field: rel.one_field,
        junction_field: rel.junction_field
      });

      // Update junction_field if missing
      if (!rel.junction_field) {
        console.log('   Updating junction_field...');

        await client.query(`
          UPDATE directus_relations
          SET junction_field = 'languages_code'
          WHERE many_collection = 'map_locations_translations'
            AND many_field = 'map_locations_id';
        `);

        console.log('   ✅ junction_field updated');
      }
    }

    // Step 4: Check fields interface configuration
    console.log('\n4️⃣ Updating fields interface...');

    const translatableFields = ['name', 'description', 'address', 'opening_hours', 'ticket_price'];

    for (const field of translatableFields) {
      // Update field meta to use translations interface
      const fieldMeta = {
        interface: 'translations',
        special: ['translations'],
        options: {
          translationsTemplate: `{{languages_code}}: {{${field}}}`
        }
      };

      await client.query(`
        UPDATE directus_fields
        SET
          interface = $1,
          special = $2,
          options = $3
        WHERE collection = 'map_locations'
          AND field = $4;
      `, ['input', ['translations'], JSON.stringify(fieldMeta.options), field]);

      console.log(`   ✅ ${field} interface updated`);
    }

    console.log('\n✅ All meta updated!');
    console.log('\n📋 Please:');
    console.log('   1. Restart Directus');
    console.log('   2. Test API with language filter again');

  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('   Stack:', error.stack);
  } finally {
    await client.end();
  }
}

fixCollectionMeta().catch(console.error);
