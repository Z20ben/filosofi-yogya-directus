import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const collections = [
  {
    collection: 'destinasi_wisata',
    icon: 'place',
    note: 'Tourist Destinations / Destinasi Wisata',
    display_template: '{{name}}',
    hidden: false
  },
  {
    collection: 'agenda_events',
    icon: 'event',
    note: 'Events and Agenda',
    display_template: '{{title}}',
    hidden: false
  },
  {
    collection: 'umkm_lokal',
    icon: 'store',
    note: 'Local Businesses (UMKM)',
    display_template: '{{name}}',
    hidden: false
  },
  {
    collection: 'spot_nongkrong',
    icon: 'local_cafe',
    note: 'Hangout Spots',
    display_template: '{{name}}',
    hidden: false
  },
  {
    collection: 'trending_articles',
    icon: 'article',
    note: 'Trending Articles',
    display_template: '{{title}}',
    hidden: false
  },
  {
    collection: 'encyclopedia_entries',
    icon: 'menu_book',
    note: 'Encyclopedia Entries',
    display_template: '{{title}}',
    hidden: false
  }
];

async function insertMetadata() {
  console.log('📝 Inserting Collections Metadata...\n');

  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();

    console.log('1️⃣ Inserting main collections...\n');

    for (const config of collections) {
      console.log(`   Inserting ${config.collection}...`);

      const translations = JSON.stringify([
        {
          language: 'id-ID',
          translation: config.note,
          singular: config.note,
          plural: config.note
        },
        {
          language: 'en-US',
          translation: config.note,
          singular: config.note,
          plural: config.note
        }
      ]);

      await client.query(`
        INSERT INTO directus_collections (
          collection, icon, note, display_template, hidden, singleton, translations
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (collection) DO UPDATE
        SET
          icon = $2,
          note = $3,
          display_template = $4,
          hidden = $5,
          singleton = $6,
          translations = $7;
      `, [
        config.collection,
        config.icon,
        config.note,
        config.display_template,
        config.hidden,
        false,
        translations
      ]);

      console.log(`   ✅ ${config.collection} inserted`);
    }

    console.log('\n2️⃣ Inserting translations collections...\n');

    const translationsCollections = collections.map(c => c.collection + '_translations');

    for (const collection of translationsCollections) {
      console.log(`   Inserting ${collection}...`);

      await client.query(`
        INSERT INTO directus_collections (collection, icon, hidden, singleton)
        VALUES ($1, 'translate', true, false)
        ON CONFLICT (collection) DO UPDATE
        SET hidden = true, icon = 'translate';
      `, [collection]);

      console.log(`   ✅ ${collection} inserted (hidden)`);
    }

    // Verify
    console.log('\n3️⃣ Verifying...\n');

    const verify = await client.query(`
      SELECT collection, icon, hidden
      FROM directus_collections
      WHERE collection NOT LIKE 'directus_%'
      ORDER BY collection;
    `);

    console.log('   Collections in directus_collections:');
    verify.rows.forEach(row => {
      const status = row.hidden ? '🔒 hidden' : '👁️  visible';
      console.log(`      ${status} - ${row.collection} (${row.icon})`);
    });

    console.log('\n✅ Metadata inserted successfully!');
    console.log('\n📋 Next:');
    console.log('   1. Restart Directus server');
    console.log('   2. Clear browser cache (Ctrl+Shift+Del)');
    console.log('   3. Re-login to Directus');
    console.log('   4. Collections should appear in Data Studio');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await client.end();
  }
}

insertMetadata().catch(console.error);
