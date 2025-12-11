import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = 'http://127.0.0.1:8055';

const collections = [
  'map_locations',
  'destinasi_wisata',
  'agenda_events',
  'umkm_lokal',
  'spot_nongkrong',
  'trending_articles',
  'encyclopedia_entries'
];

async function login() {
  const response = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    }),
  });
  const data = await response.json();
  return data.data.access_token;
}

async function auditSchema() {
  console.log('🔍 SCHEMA AUDIT FOR ALL 7 COLLECTIONS\n');
  console.log('='.repeat(60) + '\n');

  const token = await login();
  const issues = [];
  const summary = [];

  for (const col of collections) {
    // Get fields
    const fieldsRes = await fetch(`${DIRECTUS_URL}/fields/${col}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const fieldsData = await fieldsRes.json();

    // Get item count
    const countRes = await fetch(`${DIRECTUS_URL}/items/${col}?aggregate[count]=*`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const countData = await countRes.json();
    const count = countData.data?.[0]?.count || 0;

    // Get translations count
    const transRes = await fetch(`${DIRECTUS_URL}/items/${col}_translations?aggregate[count]=*`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const transData = await transRes.json();
    const transCount = transData.data?.[0]?.count || 0;

    console.log(`📦 ${col.toUpperCase()}`);
    console.log(`   Items: ${count} | Translations: ${transCount}`);

    // Check for anomalies
    const colIssues = [];

    // Check if id is integer
    const idField = fieldsData.data?.find(f => f.field === 'id');
    if (idField && idField.schema?.data_type !== 'integer') {
      colIssues.push(`❌ ID is ${idField.schema?.data_type}, should be INTEGER`);
    }

    // Check if slug exists and is unique
    const slugField = fieldsData.data?.find(f => f.field === 'slug');
    if (!slugField) {
      colIssues.push(`⚠️ Missing 'slug' field`);
    } else if (!slugField.schema?.is_unique) {
      colIssues.push(`⚠️ 'slug' should be UNIQUE`);
    }

    // Check if translations relation exists
    const transField = fieldsData.data?.find(f => f.field === 'translations');
    if (!transField) {
      colIssues.push(`⚠️ Missing 'translations' relation`);
    }

    // Check required fields based on collection type
    const requiredFields = {
      'map_locations': ['name', 'latitude', 'longitude', 'category'],
      'destinasi_wisata': ['name', 'category'],
      'agenda_events': ['title', 'date', 'category'],
      'umkm_lokal': ['name', 'category'],
      'spot_nongkrong': ['name', 'category'],
      'trending_articles': ['title', 'content'],
      'encyclopedia_entries': ['title', 'content']
    };

    const required = requiredFields[col] || [];
    for (const rf of required) {
      const field = fieldsData.data?.find(f => f.field === rf);
      if (!field) {
        colIssues.push(`⚠️ Missing required field: '${rf}'`);
      }
    }

    // Print fields
    console.log('   Fields:');
    if (fieldsData.data) {
      fieldsData.data.forEach(f => {
        const nullable = f.schema?.is_nullable === false ? '(required)' : '';
        const pk = f.schema?.is_primary_key ? ' [PK]' : '';
        const unique = f.schema?.is_unique ? ' [UNIQUE]' : '';
        const type = f.type || f.schema?.data_type || 'alias';
        console.log(`     - ${f.field}: ${type}${pk}${unique} ${nullable}`);
      });
    }

    // Print issues for this collection
    if (colIssues.length > 0) {
      console.log('   Issues:');
      colIssues.forEach(issue => console.log(`     ${issue}`));
      issues.push({ collection: col, issues: colIssues });
    } else {
      console.log('   ✅ No issues found');
    }

    summary.push({
      collection: col,
      items: parseInt(count),
      translations: parseInt(transCount),
      fields: fieldsData.data?.length || 0,
      issues: colIssues.length
    });

    console.log('');
  }

  // Print summary
  console.log('='.repeat(60));
  console.log('\n📊 SUMMARY\n');

  console.log('Collection               | Items | Trans | Fields | Issues');
  console.log('-'.repeat(60));

  let totalItems = 0;
  let totalTrans = 0;
  let totalIssues = 0;

  for (const s of summary) {
    const name = s.collection.padEnd(24);
    const items = String(s.items).padStart(5);
    const trans = String(s.translations).padStart(5);
    const fields = String(s.fields).padStart(6);
    const issueCount = String(s.issues).padStart(6);
    console.log(`${name} | ${items} | ${trans} | ${fields} | ${issueCount}`);

    totalItems += s.items;
    totalTrans += s.translations;
    totalIssues += s.issues;
  }

  console.log('-'.repeat(60));
  console.log(`${'TOTAL'.padEnd(24)} | ${String(totalItems).padStart(5)} | ${String(totalTrans).padStart(5)} |        | ${String(totalIssues).padStart(6)}`);

  // Print all issues
  if (issues.length > 0) {
    console.log('\n⚠️ ISSUES FOUND:\n');
    issues.forEach(({ collection, issues: colIssues }) => {
      console.log(`${collection}:`);
      colIssues.forEach(issue => console.log(`  ${issue}`));
    });
  } else {
    console.log('\n✅ NO ISSUES FOUND - All schemas are consistent!');
  }

  return { summary, issues };
}

auditSchema().catch(console.error);
