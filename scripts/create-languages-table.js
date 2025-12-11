import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function createLanguagesTable() {
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

    // Create directus_languages table
    console.log('1️⃣ Creating directus_languages table...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS directus_languages (
        code VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        direction VARCHAR(10) DEFAULT 'ltr'
      );
    `);

    console.log('✅ directus_languages table created\n');

    // Insert default languages
    console.log('2️⃣ Inserting languages...');

    const languages = [
      { code: 'id-ID', name: 'Indonesian', direction: 'ltr' },
      { code: 'en-US', name: 'English', direction: 'ltr' }
    ];

    for (const lang of languages) {
      await client.query(`
        INSERT INTO directus_languages (code, name, direction)
        VALUES ($1, $2, $3)
        ON CONFLICT (code) DO NOTHING;
      `, [lang.code, lang.name, lang.direction]);

      console.log(`   ✅ ${lang.name} (${lang.code})`);
    }

    // Verify
    console.log('\n3️⃣ Verifying languages...');
    const result = await client.query('SELECT * FROM directus_languages ORDER BY code');

    console.log('\n📋 Available languages:');
    result.rows.forEach(row => {
      console.log(`   🌍 ${row.code}: ${row.name} (${row.direction})`);
    });

    console.log('\n✅ Languages setup complete!');
    console.log('📋 Next: Restart Directus to recognize new languages');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }
  } finally {
    await client.end();
  }
}

createLanguagesTable().catch(console.error);
