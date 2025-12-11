/**
 * Check Roles Table Structure
 */

import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function checkRolesTable() {
  const client = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_DATABASE || 'filosofi_yogya_directus',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'qwerty123',
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\n');

    // Check table structure
    console.log('📋 directus_roles table structure:');
    const structureResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'directus_roles'
      ORDER BY ordinal_position
    `);

    console.table(structureResult.rows);

    // Check current role data
    console.log('\n📊 Current roles data:');
    const rolesResult = await client.query(`
      SELECT *
      FROM directus_roles
    `);

    console.table(rolesResult.rows);

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

checkRolesTable();
