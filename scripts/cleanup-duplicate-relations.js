import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function cleanup() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  await client.connect();

  console.log('Finding duplicate relations...\n');

  // Find duplicates
  const dupes = await client.query(`
    SELECT many_collection, many_field, one_collection, COUNT(*) as cnt,
           array_agg(id ORDER BY id) as ids
    FROM directus_relations
    GROUP BY many_collection, many_field, one_collection
    HAVING COUNT(*) > 1
  `);

  if (dupes.rows.length === 0) {
    console.log('No duplicates found!');
    await client.end();
    return;
  }

  console.log('Found duplicates:');
  dupes.rows.forEach(r => {
    console.log(`  ${r.many_collection}.${r.many_field} -> ${r.one_collection}: ${r.cnt} entries (ids: ${r.ids.join(', ')})`);
  });

  console.log('\nRemoving duplicates (keeping first)...');

  for (const dupe of dupes.rows) {
    // Keep the first ID, delete the rest
    const idsToDelete = dupe.ids.slice(1);

    for (const id of idsToDelete) {
      await client.query('DELETE FROM directus_relations WHERE id = $1', [id]);
      console.log(`  Deleted relation id ${id}`);
    }
  }

  // Verify
  console.log('\nVerification - remaining relations for translations tables:');
  const remaining = await client.query(`
    SELECT many_collection, many_field, one_collection, id
    FROM directus_relations
    WHERE many_collection LIKE '%_translations'
    ORDER BY many_collection, many_field
  `);

  let currentCol = '';
  remaining.rows.forEach(r => {
    if (r.many_collection !== currentCol) {
      console.log(`\n${r.many_collection}:`);
      currentCol = r.many_collection;
    }
    console.log(`  [${r.id}] ${r.many_field} -> ${r.one_collection}`);
  });

  console.log('\n✅ Cleanup complete! Restart Directus.');

  await client.end();
}

cleanup().catch(console.error);
