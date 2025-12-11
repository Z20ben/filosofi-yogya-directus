import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function markFieldsTranslatable() {
  console.log('🔧 Marking Fields as Translatable...\n');

  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();

    // Fields that should be translatable
    const translatableFields = ['name', 'description', 'address', 'opening_hours', 'ticket_price'];

    console.log('1️⃣ Updating field metadata...\n');

    for (const fieldName of translatableFields) {
      console.log(`   Updating ${fieldName}...`);

      // Update special column to mark as translatable
      // Directus uses special array to mark field capabilities
      await client.query(`
        UPDATE directus_fields
        SET special = ARRAY['translations']::text[]
        WHERE collection = 'map_locations'
          AND field = $1
      `, [fieldName]);

      console.log(`   ✅ ${fieldName} marked as translatable`);
    }

    console.log('\n✅ All fields updated!');
    console.log('\n📋 Please:');
    console.log('   1. Restart Directus');
    console.log('   2. Hard refresh browser');
    console.log('   3. Test API again with language filter');

  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

markFieldsTranslatable().catch(console.error);
