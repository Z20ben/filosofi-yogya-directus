import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function migrate() {
  console.log('🔄 MIGRATING map_locations: VARCHAR id → INTEGER id + slug\n');
  console.log('='.repeat(60));

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

    // Step 0: Verify current state
    console.log('0️⃣ Verifying current state...');
    const currentCheck = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'map_locations'
      AND column_name IN ('id', 'slug');
    `);

    console.log('   Current columns:');
    currentCheck.rows.forEach(r => {
      console.log(`      ${r.column_name}: ${r.data_type}`);
    });

    const hasSlug = currentCheck.rows.some(r => r.column_name === 'slug');
    if (hasSlug) {
      console.log('\n⚠️  WARNING: slug column already exists!');
      console.log('   This migration may have been run before.');
      console.log('   Aborting to prevent data loss.\n');
      return;
    }

    const count = await client.query('SELECT COUNT(*) FROM map_locations;');
    console.log(`   Records to migrate: ${count.rows[0].count}\n`);

    // Step 1: Add new integer id column
    console.log('1️⃣ Adding new INTEGER id column (id_new)...');
    await client.query(`
      ALTER TABLE map_locations
      ADD COLUMN id_new SERIAL;
    `);
    console.log('   ✅ id_new column added\n');

    // Step 2: Add slug column (copy from old id)
    console.log('2️⃣ Adding slug column (copy from current id)...');
    await client.query(`
      ALTER TABLE map_locations
      ADD COLUMN slug VARCHAR(255);
    `);

    await client.query(`
      UPDATE map_locations
      SET slug = id;
    `);

    await client.query(`
      ALTER TABLE map_locations
      ALTER COLUMN slug SET NOT NULL;
    `);

    await client.query(`
      CREATE UNIQUE INDEX idx_map_locations_slug ON map_locations(slug);
    `);

    console.log('   ✅ slug column created and populated\n');

    // Step 3: Get mapping for FK updates
    console.log('3️⃣ Creating id mapping...');
    const mapping = await client.query(`
      SELECT id as old_id, id_new, slug
      FROM map_locations
      ORDER BY id_new;
    `);

    console.log(`   ✅ Mapping created for ${mapping.rows.length} locations\n`);

    // Step 4: Update FK references in 4 collections
    console.log('4️⃣ Updating FK references in related collections...\n');

    const relatedCollections = ['destinasi_wisata', 'agenda_events', 'umkm_lokal', 'spot_nongkrong'];

    for (const collection of relatedCollections) {
      console.log(`   📦 ${collection}...`);

      // Add new column
      await client.query(`
        ALTER TABLE ${collection}
        ADD COLUMN map_location_id_new INTEGER;
      `);

      // Update values based on mapping
      for (const row of mapping.rows) {
        await client.query(`
          UPDATE ${collection}
          SET map_location_id_new = $1
          WHERE map_location_id = $2;
        `, [row.id_new, row.old_id]);
      }

      const updatedCount = await client.query(`
        SELECT COUNT(*) FROM ${collection} WHERE map_location_id_new IS NOT NULL;
      `);

      console.log(`      ✅ Updated ${updatedCount.rows[0].count} FK references`);

      // Drop old FK constraint first
      await client.query(`
        ALTER TABLE ${collection}
        DROP CONSTRAINT IF EXISTS ${collection}_map_location_id_foreign;
      `);

      // Drop old column
      await client.query(`
        ALTER TABLE ${collection}
        DROP COLUMN map_location_id;
      `);

      // Rename new column
      await client.query(`
        ALTER TABLE ${collection}
        RENAME COLUMN map_location_id_new TO map_location_id;
      `);

      // Note: We'll add FK constraint after map_locations.id is INTEGER
      console.log(`      ✅ ${collection} complete\n`);
    }

    // Step 5: Update map_locations_translations FK
    console.log('5️⃣ Updating map_locations_translations FK...');

    await client.query(`
      ALTER TABLE map_locations_translations
      ADD COLUMN map_locations_id_new INTEGER;
    `);

    for (const row of mapping.rows) {
      await client.query(`
        UPDATE map_locations_translations
        SET map_locations_id_new = $1
        WHERE map_locations_id = $2;
      `, [row.id_new, row.old_id]);
    }

    const transCount = await client.query(`
      SELECT COUNT(*) FROM map_locations_translations WHERE map_locations_id_new IS NOT NULL;
    `);

    console.log(`   ✅ Updated ${transCount.rows[0].count} translation FK references`);

    // Drop old FK constraint
    await client.query(`
      ALTER TABLE map_locations_translations
      DROP CONSTRAINT IF EXISTS map_locations_translations_map_locations_id_foreign;
    `);

    await client.query(`
      ALTER TABLE map_locations_translations
      DROP COLUMN map_locations_id;
    `);

    await client.query(`
      ALTER TABLE map_locations_translations
      RENAME COLUMN map_locations_id_new TO map_locations_id;
    `);

    console.log('   ✅ map_locations_translations complete\n');

    // Step 6: Finalize map_locations - drop old id, rename id_new to id
    console.log('6️⃣ Finalizing map_locations table structure...');

    // Drop old PK constraint
    await client.query(`
      ALTER TABLE map_locations
      DROP CONSTRAINT IF EXISTS map_locations_pkey;
    `);

    // Drop old id column
    await client.query(`
      ALTER TABLE map_locations
      DROP COLUMN id;
    `);

    // Rename id_new to id
    await client.query(`
      ALTER TABLE map_locations
      RENAME COLUMN id_new TO id;
    `);

    // Add new PK constraint
    await client.query(`
      ALTER TABLE map_locations
      ADD PRIMARY KEY (id);
    `);

    console.log('   ✅ map_locations structure finalized\n');

    // Step 7: Add FK constraints back
    console.log('7️⃣ Adding FK constraints...\n');

    for (const collection of relatedCollections) {
      await client.query(`
        ALTER TABLE ${collection}
        ADD CONSTRAINT ${collection}_map_location_id_fkey
        FOREIGN KEY (map_location_id)
        REFERENCES map_locations(id)
        ON DELETE SET NULL;
      `);
      console.log(`   ✅ ${collection} FK constraint added`);
    }

    await client.query(`
      ALTER TABLE map_locations_translations
      ADD CONSTRAINT map_locations_translations_map_locations_id_fkey
      FOREIGN KEY (map_locations_id)
      REFERENCES map_locations(id)
      ON DELETE CASCADE;
    `);
    console.log('   ✅ map_locations_translations FK constraint added\n');

    // Step 8: Update Directus metadata
    console.log('8️⃣ Updating Directus metadata...');

    // Update id field metadata
    await client.query(`
      UPDATE directus_fields
      SET
        type = 'integer',
        schema = jsonb_set(
          COALESCE(schema, '{}'::jsonb),
          '{data_type}',
          '"integer"'
        ),
        meta = jsonb_set(
          COALESCE(meta, '{}'::jsonb),
          '{interface}',
          '"input"'
        )
      WHERE collection = 'map_locations' AND field = 'id';
    `);

    // Add slug field metadata
    await client.query(`
      INSERT INTO directus_fields (collection, field, type, schema, meta)
      VALUES (
        'map_locations',
        'slug',
        'string',
        '{"data_type": "varchar", "max_length": 255, "is_nullable": false, "is_unique": true}'::jsonb,
        '{"interface": "input", "required": true, "options": {"trim": true, "slug": true}}'::jsonb
      )
      ON CONFLICT (collection, field) DO UPDATE
      SET
        type = EXCLUDED.type,
        schema = EXCLUDED.schema,
        meta = EXCLUDED.meta;
    `);

    console.log('   ✅ Directus metadata updated\n');

    // Verification
    console.log('9️⃣ Verification...\n');

    const finalCheck = await client.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'map_locations'
      AND column_name IN ('id', 'slug')
      ORDER BY column_name;
    `);

    console.log('   Final structure:');
    finalCheck.rows.forEach(r => {
      console.log(`      ${r.column_name}: ${r.data_type} (nullable: ${r.is_nullable}, default: ${r.column_default})`);
    });

    const sampleData = await client.query(`
      SELECT id, slug, name
      FROM map_locations
      ORDER BY id
      LIMIT 5;
    `);

    console.log('\n   Sample data:');
    sampleData.rows.forEach(r => {
      console.log(`      ID: ${r.id}, slug: "${r.slug}", name: "${r.name}"`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRATION COMPLETE!\n');
    console.log('📊 Summary:');
    console.log('   ✅ map_locations.id: VARCHAR → INTEGER (auto-increment)');
    console.log('   ✅ map_locations.slug: Created from old id values');
    console.log('   ✅ 4 collections FK updated (destinasi_wisata, agenda_events, umkm_lokal, spot_nongkrong)');
    console.log('   ✅ map_locations_translations FK updated');
    console.log('   ✅ All FK constraints recreated');
    console.log('   ✅ Directus metadata updated');
    console.log('\n📋 Next steps:');
    console.log('   1. Restart Directus server');
    console.log('   2. Hard refresh browser (Ctrl+Shift+Del)');
    console.log('   3. Test API: GET /items/map_locations');
    console.log('   4. Verify frontend integration');
    console.log('   5. Update import scripts to use slug instead of id\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('   Stack:', error.stack);
    console.error('\n⚠️  Migration failed! Database may be in inconsistent state.');
    console.error('   Restore from backup if needed.\n');
  } finally {
    await client.end();
  }
}

migrate().catch(console.error);
