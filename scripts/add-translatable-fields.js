import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

// Fields to add to translations tables
const FIELDS_TO_ADD = {
  map_locations_translations: [
    { field: 'facilities', type: 'text', interface: 'tags' }
  ],
  agenda_events_translations: [
    { field: 'ticket_price', type: 'varchar(255)', interface: 'input' }
  ],
  umkm_lokal_translations: [
    { field: 'opening_hours', type: 'varchar(255)', interface: 'input' },
    { field: 'price_range', type: 'varchar(255)', interface: 'input' }
  ],
  spot_nongkrong_translations: [
    { field: 'category', type: 'varchar(255)', interface: 'input' },
    { field: 'opening_hours', type: 'varchar(255)', interface: 'input' },
    { field: 'price_range', type: 'varchar(255)', interface: 'input' }
  ],
  trending_articles_translations: [
    { field: 'category', type: 'varchar(255)', interface: 'input' }
  ]
};

// Corresponding main tables and their fields to migrate then remove
const MAIN_FIELDS_TO_MIGRATE = {
  map_locations: ['facilities'],
  agenda_events: ['ticket_price'],
  umkm_lokal: ['opening_hours', 'price_range'],
  spot_nongkrong: ['category', 'opening_hours', 'price_range'],
  trending_articles: ['category']
};

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  await client.connect();

  console.log('=== ADDING TRANSLATABLE FIELDS ===\n');

  // Step 1: Add columns to translations tables
  for (const [table, fields] of Object.entries(FIELDS_TO_ADD)) {
    console.log(`📦 ${table}`);

    for (const { field, type, interface: iface } of fields) {
      // Check if column exists
      const colCheck = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
        [table, field]
      );

      if (colCheck.rows.length === 0) {
        // Add column
        await client.query(`ALTER TABLE ${table} ADD COLUMN ${field} ${type}`);
        console.log(`   ✅ Added column: ${field}`);

        // Register in directus_fields
        await client.query(`
          INSERT INTO directus_fields (collection, field, interface, width, sort)
          VALUES ($1, $2, $3, 'full', 20)
        `, [table, field, iface]);
        console.log(`   ✅ Registered field: ${field}`);
      } else {
        console.log(`   ⚠️ Column ${field} already exists`);
      }
    }
  }

  // Step 2: Migrate data from main tables to translations
  console.log('\n=== MIGRATING DATA ===\n');

  for (const [mainTable, fields] of Object.entries(MAIN_FIELDS_TO_MIGRATE)) {
    const transTable = `${mainTable}_translations`;
    const fkField = `${mainTable}_id`;

    console.log(`📦 ${mainTable} -> ${transTable}`);

    // Get all items from main table
    const items = await client.query(`SELECT * FROM ${mainTable}`);

    for (const item of items.rows) {
      for (const field of fields) {
        if (item[field] !== null && item[field] !== undefined) {
          // Update id-ID translation
          await client.query(
            `UPDATE ${transTable} SET ${field} = $1 WHERE ${fkField} = $2 AND code = 'id-ID'`,
            [item[field], item.id]
          );

          // Update en-US translation (same value for now)
          await client.query(
            `UPDATE ${transTable} SET ${field} = $1 WHERE ${fkField} = $2 AND code = 'en-US'`,
            [item[field], item.id]
          );
        }
      }
    }
    console.log(`   ✅ Migrated ${items.rows.length} items`);
  }

  // Step 3: Remove fields from main tables
  console.log('\n=== REMOVING FROM MAIN TABLES ===\n');

  for (const [mainTable, fields] of Object.entries(MAIN_FIELDS_TO_MIGRATE)) {
    console.log(`📦 ${mainTable}`);

    for (const field of fields) {
      // Check if column exists in main table
      const colCheck = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
        [mainTable, field]
      );

      if (colCheck.rows.length > 0) {
        // Remove from directus_fields
        await client.query(
          `DELETE FROM directus_fields WHERE collection = $1 AND field = $2`,
          [mainTable, field]
        );

        // Drop column
        await client.query(`ALTER TABLE ${mainTable} DROP COLUMN ${field}`);
        console.log(`   ✅ Removed: ${field}`);
      } else {
        console.log(`   ⚠️ ${field} not in main table`);
      }
    }
  }

  // Verification
  console.log('\n=== VERIFICATION ===\n');

  for (const table of Object.keys(FIELDS_TO_ADD)) {
    const cols = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
      [table]
    );
    console.log(`${table}:`);
    console.log(`   ${cols.rows.map(r => r.column_name).join(', ')}`);
  }

  await client.end();
  console.log('\n✅ Done! Restart Directus.');
}

main().catch(console.error);
