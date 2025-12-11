import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

// Collections that should have map_location relation
const collectionsWithLocation = [
  'destinasi_wisata',
  'agenda_events',
  'umkm_lokal',
  'spot_nongkrong'
];

async function addMapLocationRelations() {
  console.log('🔗 Adding map_location Relations...\n');

  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    for (const collection of collectionsWithLocation) {
      console.log(`📍 Adding map_location to ${collection}...`);

      // Step 1: Add map_location_id column
      console.log('   1️⃣ Adding map_location_id column...');

      await client.query(`
        ALTER TABLE ${collection}
        ADD COLUMN IF NOT EXISTS map_location_id VARCHAR(255) REFERENCES map_locations(id) ON DELETE SET NULL;
      `);

      console.log('   ✅ Column added');

      // Step 2: Create M2O relation in directus_relations
      console.log('   2️⃣ Creating M2O relation...');

      await client.query(`
        INSERT INTO directus_relations (many_collection, many_field, one_collection)
        VALUES ($1, 'map_location_id', 'map_locations')
        ON CONFLICT DO NOTHING;
      `, [collection]);

      console.log('   ✅ Relation created');

      // Step 3: Update field metadata in directus_fields
      console.log('   3️⃣ Updating field metadata...');

      // Check if field metadata exists
      const fieldCheck = await client.query(`
        SELECT * FROM directus_fields
        WHERE collection = $1 AND field = 'map_location_id';
      `, [collection]);

      if (fieldCheck.rows.length > 0) {
        // Update existing
        await client.query(`
          UPDATE directus_fields
          SET
            interface = 'select-dropdown-m2o',
            special = ARRAY['m2o']::text[],
            options = $2
          WHERE collection = $1 AND field = 'map_location_id';
        `, [collection, JSON.stringify({
          template: '{{name}}',
          enableCreate: false,
          enableSelect: true
        })]);

        console.log('   ✅ Field metadata updated');
      } else {
        // Insert new
        await client.query(`
          INSERT INTO directus_fields (collection, field, interface, special, options)
          VALUES ($1, 'map_location_id', 'select-dropdown-m2o', ARRAY['m2o']::text[], $2);
        `, [collection, JSON.stringify({
          template: '{{name}}',
          enableCreate: false,
          enableSelect: true
        })]);

        console.log('   ✅ Field metadata created');
      }

      console.log(`   ✅ ${collection} complete!\n`);
    }

    console.log('✅ All relations added successfully!\n');

    console.log('📋 Summary:');
    console.log('   Collections with map_location relation:');
    collectionsWithLocation.forEach(c => console.log(`   - ${c}.map_location_id → map_locations.id`));

    console.log('\n💡 Usage:');
    console.log('   - Optional field (can be null)');
    console.log('   - Reference existing map_location for consistency');
    console.log('   - OR use latitude/longitude directly');
    console.log('   - Frontend can query: location_data = item.map_location_id || {lat: item.latitude, lng: item.longitude}');

    console.log('\n📋 Next:');
    console.log('   1. Restart Directus');
    console.log('   2. Check collections - should see map_location dropdown');
    console.log('   3. Import data with map_location references');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await client.end();
  }
}

addMapLocationRelations().catch(console.error);
