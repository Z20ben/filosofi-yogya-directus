/**
 * Check Policies and Access Tables
 */

import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function checkPolicies() {
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

    // Check policies table
    console.log('📋 directus_policies:');
    const policiesResult = await client.query(`SELECT * FROM directus_policies`);
    console.table(policiesResult.rows);

    // Check access table
    console.log('\n📋 directus_access:');
    const accessResult = await client.query(`SELECT * FROM directus_access`);
    console.table(accessResult.rows);

    // Check user's role and policy assignment
    console.log('\n📋 directus_users (admin):');
    const usersResult = await client.query(`
      SELECT id, email, role
      FROM directus_users
      WHERE email = 'admin@example.com'
    `);
    console.table(usersResult.rows);

    // Check if permissions exist for map_locations with Administrator policy
    console.log('\n📋 directus_permissions for map_locations:');
    const permissionsResult = await client.query(`
      SELECT p.*, pol.name as policy_name
      FROM directus_permissions p
      LEFT JOIN directus_policies pol ON p.policy = pol.id
      WHERE p.collection = 'map_locations'
    `);
    if (permissionsResult.rows.length === 0) {
      console.log('   ⚠️  NO PERMISSIONS FOUND! This is the problem!');
    } else {
      console.table(permissionsResult.rows);
    }

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

checkPolicies();
