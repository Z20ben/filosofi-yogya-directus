import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function listTables() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();

    // Check all tables
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('📋 All tables in database:\n');
    result.rows.forEach(row => {
      const name = row.table_name;
      const icon = name.includes('language') || name.includes('translation') ? '🌍' :
                   name.startsWith('directus_') ? '⚙️' : '📦';
      console.log(`${icon} ${name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

listTables().catch(console.error);
