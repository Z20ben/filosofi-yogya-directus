import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function setupLanguagesViaDatabase() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('🔌 Connected to PostgreSQL\n');

    // Check if directus_languages table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'directus_languages'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ directus_languages table does not exist');
      console.log('📋 Please enable translations in Directus UI:');
      console.log('   Settings > Project Settings > Enable "Multi-Language Content"\n');
      return;
    }

    console.log('✅ directus_languages table exists\n');

    // Check existing languages
    const existingLangs = await client.query('SELECT * FROM directus_languages');
    console.log('📋 Existing languages:', existingLangs.rows.map(l => l.code).join(', ') || 'none\n');

    // Languages to create
    const languages = [
      { code: 'id-ID', name: 'Indonesian', direction: 'ltr' },
      { code: 'en-US', name: 'English', direction: 'ltr' }
    ];

    console.log('🌍 Creating languages...\n');

    for (const lang of languages) {
      const exists = existingLangs.rows.find(l => l.code === lang.code);

      if (exists) {
        console.log(`⏭️  ${lang.name} (${lang.code}) already exists`);
      } else {
        await client.query(
          'INSERT INTO directus_languages (code, name, direction) VALUES ($1, $2, $3)',
          [lang.code, lang.name, lang.direction]
        );
        console.log(`✅ ${lang.name} (${lang.code}) created`);
      }
    }

    console.log('\n✅ Language setup complete!');
    console.log('📋 Please restart Directus to apply changes.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

setupLanguagesViaDatabase().catch(console.error);
