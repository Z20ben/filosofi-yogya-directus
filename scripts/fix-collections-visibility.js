import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function fixVisibility() {
  console.log('👁️  Fixing Collections Visibility...\n');

  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();

    // Collections that should be visible
    const visibleCollections = [
      'destinasi_wisata',
      'agenda_events',
      'umkm_lokal',
      'spot_nongkrong',
      'trending_articles',
      'encyclopedia_entries'
    ];

    console.log('1️⃣ Checking current visibility...\n');

    const currentMeta = await client.query(`
      SELECT collection, meta
      FROM directus_collections
      WHERE collection IN (${visibleCollections.map((_, i) => `$${i + 1}`).join(',')});
    `, visibleCollections);

    currentMeta.rows.forEach(row => {
      const meta = typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta;
      console.log(`   ${row.collection}:`);
      console.log(`      hidden: ${meta?.hidden}`);
      console.log(`      icon: ${meta?.icon || 'none'}`);
    });

    console.log('\n2️⃣ Updating visibility...\n');

    const icons = {
      destinasi_wisata: 'place',
      agenda_events: 'event',
      umkm_lokal: 'store',
      spot_nongkrong: 'local_cafe',
      trending_articles: 'article',
      encyclopedia_entries: 'menu_book'
    };

    for (const collection of visibleCollections) {
      // Get current meta
      const result = await client.query(`
        SELECT meta FROM directus_collections WHERE collection = $1;
      `, [collection]);

      let meta = {};
      if (result.rows.length > 0 && result.rows[0].meta) {
        meta = typeof result.rows[0].meta === 'string'
          ? JSON.parse(result.rows[0].meta)
          : result.rows[0].meta;
      }

      // Update meta to ensure visibility
      meta.hidden = false;
      meta.icon = icons[collection];
      meta.display_template = meta.display_template || '{{name}}';

      await client.query(`
        UPDATE directus_collections
        SET meta = $1
        WHERE collection = $2;
      `, [JSON.stringify(meta), collection]);

      console.log(`   ✅ ${collection} - set to visible`);
    }

    // Hide translations collections
    console.log('\n3️⃣ Hiding translations collections...\n');

    const translationsCollections = visibleCollections.map(c => `${c}_translations`);

    for (const collection of translationsCollections) {
      await client.query(`
        UPDATE directus_collections
        SET meta = jsonb_set(COALESCE(meta, '{}'::jsonb), '{hidden}', 'true')
        WHERE collection = $1;
      `, [collection]);

      console.log(`   ✅ ${collection} - hidden`);
    }

    console.log('\n4️⃣ Checking permissions...\n');

    // Check if Administrator policy has permissions
    const adminPolicy = await client.query(`
      SELECT id FROM directus_policies WHERE name = 'Administrator Policy';
    `);

    if (adminPolicy.rows.length > 0) {
      const policyId = adminPolicy.rows[0].id;

      // Check permissions for each collection
      for (const collection of visibleCollections) {
        const permCheck = await client.query(`
          SELECT * FROM directus_permissions
          WHERE collection = $1 AND policy = $2;
        `, [collection, policyId]);

        if (permCheck.rows.length === 0) {
          console.log(`   ⚠️  ${collection} - no permissions, creating...`);

          // Create full CRUD permissions
          const actions = ['create', 'read', 'update', 'delete'];
          for (const action of actions) {
            await client.query(`
              INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
              VALUES ($1, $2, '{}', '*', $3)
              ON CONFLICT DO NOTHING;
            `, [collection, action, policyId]);
          }

          console.log(`      ✅ Permissions created`);
        } else {
          console.log(`   ✅ ${collection} - permissions OK`);
        }
      }
    }

    console.log('\n✅ Visibility fixed!');
    console.log('\n📋 Next:');
    console.log('   1. Restart Directus');
    console.log('   2. Clear browser cache completely');
    console.log('   3. Login again');
    console.log('   4. Check Data Studio');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixVisibility().catch(console.error);
