import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function configure() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  await client.connect();

  console.log('=== CONFIGURING FIELDS ===\n');

  // Field configurations to apply
  const fieldConfigs = [
    // Latitude/Longitude
    { collections: ['destinasi_wisata', 'agenda_events', 'umkm_lokal', 'spot_nongkrong'], field: 'latitude', iface: 'input', width: 'half' },
    { collections: ['destinasi_wisata', 'agenda_events', 'umkm_lokal', 'spot_nongkrong'], field: 'longitude', iface: 'input', width: 'half' },

    // Tags
    { collections: ['agenda_events', 'umkm_lokal', 'spot_nongkrong', 'trending_articles', 'encyclopedia_entries'], field: 'tags', iface: 'tags', width: 'full' },

    // Status with choices
    { collections: ['destinasi_wisata', 'agenda_events', 'umkm_lokal', 'spot_nongkrong', 'trending_articles', 'encyclopedia_entries'], field: 'status', iface: 'select-dropdown', width: 'half', options: { choices: [{ text: 'Published', value: 'published' }, { text: 'Draft', value: 'draft' }, { text: 'Archived', value: 'archived' }] } },

    // Sort (hidden)
    { collections: ['destinasi_wisata', 'agenda_events', 'umkm_lokal', 'spot_nongkrong', 'trending_articles', 'encyclopedia_entries'], field: 'sort', iface: 'input', width: 'half', hidden: true },

    // Slug
    { collections: ['destinasi_wisata', 'agenda_events', 'umkm_lokal', 'spot_nongkrong', 'trending_articles', 'encyclopedia_entries'], field: 'slug', iface: 'input', width: 'full' },

    // Contact fields
    { collections: ['umkm_lokal', 'spot_nongkrong'], field: 'phone', iface: 'input', width: 'half' },
    { collections: ['umkm_lokal'], field: 'whatsapp', iface: 'input', width: 'half' },
    { collections: ['umkm_lokal', 'spot_nongkrong'], field: 'instagram', iface: 'input', width: 'half' },
    { collections: ['umkm_lokal'], field: 'facebook', iface: 'input', width: 'half' },
    { collections: ['umkm_lokal'], field: 'website', iface: 'input', width: 'half' },

    // Spot nongkrong specific
    { collections: ['spot_nongkrong'], field: 'badges', iface: 'tags', width: 'full' },
    { collections: ['spot_nongkrong'], field: 'facilities', iface: 'tags', width: 'full' },

    // Agenda events specific
    { collections: ['agenda_events'], field: 'event_date', iface: 'datetime', width: 'half' },
    { collections: ['agenda_events'], field: 'start_time', iface: 'input', width: 'half' },
    { collections: ['agenda_events'], field: 'end_time', iface: 'input', width: 'half' },
    { collections: ['agenda_events'], field: 'organizer', iface: 'input', width: 'full' },

    // Articles specific
    { collections: ['trending_articles'], field: 'views', iface: 'input', width: 'half' },
    { collections: ['trending_articles'], field: 'published_date', iface: 'datetime', width: 'half' },

    // Date created/updated (readonly)
    { collections: ['destinasi_wisata', 'agenda_events', 'umkm_lokal', 'spot_nongkrong', 'trending_articles', 'encyclopedia_entries'], field: 'date_created', iface: 'datetime', width: 'half', readonly: true },
    { collections: ['destinasi_wisata', 'agenda_events', 'umkm_lokal', 'spot_nongkrong', 'trending_articles', 'encyclopedia_entries'], field: 'date_updated', iface: 'datetime', width: 'half', readonly: true },
  ];

  for (const config of fieldConfigs) {
    for (const col of config.collections) {
      // Check if field exists in DB
      const colCheck = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
        [col, config.field]
      );

      if (colCheck.rows.length === 0) continue;

      // Check if directus_fields entry exists
      const fieldCheck = await client.query(
        `SELECT id FROM directus_fields WHERE collection = $1 AND field = $2`,
        [col, config.field]
      );

      const options = config.options ? JSON.stringify(config.options) : null;
      const hidden = config.hidden || false;
      const readonly = config.readonly || false;

      if (fieldCheck.rows.length === 0) {
        await client.query(
          `INSERT INTO directus_fields (collection, field, interface, width, hidden, readonly, options) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [col, config.field, config.iface, config.width, hidden, readonly, options]
        );
        console.log('✅ Created: ' + col + '.' + config.field);
      } else {
        await client.query(
          `UPDATE directus_fields SET interface = $1, width = $2, hidden = $3, readonly = $4, options = COALESCE($5, options) WHERE collection = $6 AND field = $7`,
          [config.iface, config.width, hidden, readonly, options, col, config.field]
        );
        console.log('✅ Updated: ' + col + '.' + config.field);
      }
    }
  }

  await client.end();
  console.log('\n✅ Done! Restart Directus.');
}

configure().catch(console.error);
