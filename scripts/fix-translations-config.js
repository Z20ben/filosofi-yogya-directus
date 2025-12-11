/**
 * Fix Translations Configuration
 *
 * This fixes the translations interface configuration for all collections.
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const COLLECTIONS = [
  'map_locations',
  'destinasi_wisata',
  'agenda_events',
  'umkm_lokal',
  'spot_nongkrong',
  'trending_articles',
  'encyclopedia_entries',
];

async function main() {
  console.log('🔧 FIXING TRANSLATIONS CONFIGURATION\n');

  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  await client.connect();

  try {
    for (const collection of COLLECTIONS) {
      const transCollection = `${collection}_translations`;
      const idField = `${collection}_id`;

      console.log(`📦 ${collection}`);

      // 1. Fix languages_code field - correct special array format
      console.log('   Fixing languages_code field...');
      await client.query(`
        UPDATE directus_fields
        SET special = '["m2o"]'::jsonb,
            interface = 'select-dropdown-m2o',
            options = '{"template": "{{name}}"}'::jsonb,
            display = 'related-values',
            display_options = '{"template": "{{name}}"}'::jsonb,
            hidden = true
        WHERE collection = $1 AND field = 'languages_code'
      `, [transCollection]);

      // 2. Fix the FK field to parent
      console.log('   Fixing parent FK field...');
      await client.query(`
        UPDATE directus_fields
        SET special = '["m2o"]'::jsonb,
            interface = 'select-dropdown-m2o',
            hidden = true
        WHERE collection = $1 AND field = $2
      `, [transCollection, idField]);

      // 3. Update the relation for languages_code to have proper junction_field
      console.log('   Updating languages_code relation...');
      await client.query(`
        UPDATE directus_relations
        SET junction_field = $2
        WHERE many_collection = $1 AND many_field = 'languages_code'
      `, [transCollection, idField]);

      // 4. Update the relation for parent FK to have proper junction_field
      console.log('   Updating parent relation...');
      await client.query(`
        UPDATE directus_relations
        SET junction_field = 'languages_code'
        WHERE many_collection = $1 AND many_field = $2
      `, [transCollection, idField]);

      // 5. Make sure translations collection is hidden
      console.log('   Setting collection as hidden...');
      await client.query(`
        UPDATE directus_collections
        SET hidden = true, icon = 'translate'
        WHERE collection = $1
      `, [transCollection]);

      // 6. Ensure translations field has correct config
      console.log('   Fixing translations field...');
      await client.query(`
        UPDATE directus_fields
        SET interface = 'translations',
            special = '["translations"]'::jsonb,
            options = '{"languageField": "languages_code", "translationLanguageField": "code"}'::jsonb
        WHERE collection = $1 AND field = 'translations'
      `, [collection]);

      console.log('   ✅ Done\n');
    }

    console.log('='.repeat(50));
    console.log('✅ ALL CONFIGURATIONS FIXED\n');
    console.log('📋 NEXT STEPS:');
    console.log('1. Restart Directus: Ctrl+C then npm run start');
    console.log('2. Clear browser cache (Ctrl+Shift+Delete)');
    console.log('3. Check translations UI');

  } finally {
    await client.end();
  }
}

main().catch(console.error);
