import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

await client.connect();

console.log('🔓 Fixing slug field permissions...\n');

// Check if slug field exists
const fieldCheck = await client.query(`
  SELECT field, special, interface, hidden
  FROM directus_fields
  WHERE collection = 'map_locations' AND field = 'slug';
`);

if (fieldCheck.rows.length === 0) {
  console.log('❌ slug field not found in directus_fields!');
  await client.end();
  process.exit(1);
}

console.log('✅ slug field exists in metadata:');
console.log(`   interface: ${fieldCheck.rows[0].interface}`);
console.log(`   special: ${fieldCheck.rows[0].special}`);
console.log(`   hidden: ${fieldCheck.rows[0].hidden}\n`);

// Make sure slug is not hidden
await client.query(`
  UPDATE directus_fields
  SET hidden = false
  WHERE collection = 'map_locations' AND field = 'slug';
`);

console.log('✅ slug field set to visible\n');

// Get admin role
const adminRole = await client.query(`
  SELECT id, name FROM directus_roles WHERE name = 'Administrator' LIMIT 1;
`);

if (adminRole.rows.length === 0) {
  console.log('⚠️  No Administrator role found');
  console.log('   Checking for permissions with wildcard...\n');

  // Check if permissions use wildcard (all fields)
  const wildcardPerms = await client.query(`
    SELECT id, action, permissions, fields
    FROM directus_permissions
    WHERE collection = 'map_locations'
    AND (fields = '*' OR fields IS NULL);
  `);

  if (wildcardPerms.rows.length > 0) {
    console.log('✅ Permissions use wildcard - all fields accessible');
    wildcardPerms.rows.forEach(p => {
      console.log(`   Action: ${p.action}, fields: ${p.fields || 'NULL (all fields)'}`);
    });
  } else {
    console.log('❌ No wildcard permissions found - this may be an issue');
  }
} else {
  console.log(`✅ Found admin role: ${adminRole.rows[0].name} (ID: ${adminRole.rows[0].id})\n`);

  // Check current permissions
  const perms = await client.query(`
    SELECT id, action, permissions, fields
    FROM directus_permissions
    WHERE role = $1 AND collection = 'map_locations';
  `, [adminRole.rows[0].id]);

  if (perms.rows.length > 0) {
    console.log('Current permissions:');
    perms.rows.forEach(p => {
      console.log(`   Action: ${p.action}, fields: ${p.fields || 'NULL'}`);
    });
  } else {
    console.log('⚠️  No permissions found for map_locations');
  }
}

console.log('\n✅ Directus should auto-detect the slug field on restart');
console.log('\n📋 Next steps:');
console.log('   1. Restart Directus: npm run start');
console.log('   2. Hard refresh browser (Ctrl+Shift+Del)');
console.log('   3. Re-test API with slug field');

await client.end();
