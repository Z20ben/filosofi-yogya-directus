import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const TRANSLATIONS_TABLES = [
  { table: 'map_locations_translations', fk: 'map_locations_id' },
];

async function fix() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  await client.connect();

  console.log('=== ADDING SLUG TO TRANSLATIONS ===\n');

  for (const { table, fk } of TRANSLATIONS_TABLES) {
    console.log(`Processing ${table}...`);

    // Check if slug column exists
    const colCheck = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = 'slug'`,
      [table]
    );

    if (colCheck.rows.length === 0) {
      // Add slug column
      await client.query(`ALTER TABLE ${table} ADD COLUMN slug VARCHAR(255)`);
      console.log('  ✅ Added slug column');

      // Register in directus_fields
      await client.query(`
        INSERT INTO directus_fields (collection, field, interface, special, sort, width)
        VALUES ($1, 'slug', 'input', NULL, 2, 'full')
      `, [table]);
      console.log('  ✅ Registered slug field');
    } else {
      console.log('  ⚠️ slug column already exists');
    }
  }

  console.log('\n=== FIXING FIELD SORT ORDER FOR MAP_LOCATIONS ===\n');

  // Define desired sort order
  const sortOrder = [
    { field: 'id', sort: 1 },
    { field: 'slug', sort: 2 },
    { field: 'translations', sort: 3 },
    { field: 'category', sort: 10 },
    { field: 'subcategory', sort: 11 },
    { field: 'latitude', sort: 20 },
    { field: 'longitude', sort: 21 },
    { field: 'google_maps_url', sort: 22 },
    { field: 'image', sort: 30 },
    { field: 'facilities', sort: 40 },
    { field: 'phone', sort: 50 },
    { field: 'email', sort: 51 },
    { field: 'whatsapp', sort: 52 },
    { field: 'website', sort: 53 },
    { field: 'instagram', sort: 54 },
    { field: 'facebook', sort: 55 },
    { field: 'status', sort: 90 },
    { field: 'sort', sort: 91 },
    { field: 'created_at', sort: 98 },
    { field: 'updated_at', sort: 99 },
  ];

  for (const { field, sort } of sortOrder) {
    await client.query(
      `UPDATE directus_fields SET sort = $1 WHERE collection = 'map_locations' AND field = $2`,
      [sort, field]
    );
  }
  console.log('✅ Updated field sort order');

  // Verify
  console.log('\n=== VERIFICATION ===\n');

  const cols = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'map_locations_translations' ORDER BY ordinal_position`
  );
  console.log('map_locations_translations columns:', cols.rows.map(r => r.column_name).join(', '));

  const fields = await client.query(
    `SELECT field, sort FROM directus_fields WHERE collection = 'map_locations' ORDER BY sort NULLS LAST`
  );
  console.log('\nmap_locations field order:');
  fields.rows.forEach(r => console.log('  ' + r.sort + ': ' + r.field));

  await client.end();
  console.log('\n✅ Done! Restart Directus.');
}

fix().catch(console.error);
