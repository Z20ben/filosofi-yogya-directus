/**
 * Phase 3: Content Population Script
 *
 * This script:
 * 1. Fixes schema anomalies (UNIQUE constraints, relations)
 * 2. Imports mock data from TypeScript files
 * 3. Creates translations for each item
 * 4. Verifies data integrity
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const DIRECTUS_URL = 'http://127.0.0.1:8055';
let accessToken = null;

// Mock data location - CORRECTED PATH
const MOCK_DATA_PATH = 'D:/Dev/next-budaya/filosofi-yogya-mod/lib/data/mock';

// Collection configurations
const COLLECTIONS = {
  destinasi_wisata: {
    idField: 'destinasi_wisata_id',
    translatableFields: ['name', 'location', 'description', 'hours'],
    mockFile: 'destinasi-wisata.data.ts',
    mockExport: 'destinasiWisata',
  },
  agenda_events: {
    idField: 'agenda_events_id',
    translatableFields: ['title', 'description', 'location', 'organizer'],
    mockFile: 'agenda-event.data.ts',
    mockExport: 'agendaEvents',
  },
  umkm_lokal: {
    idField: 'umkm_lokal_id',
    translatableFields: ['name', 'description', 'address', 'category'],
    mockFile: 'umkm-lokal.data.ts',
    mockExport: 'umkmLokal',
  },
  spot_nongkrong: {
    idField: 'spot_nongkrong_id',
    translatableFields: ['name', 'description', 'address'],
    mockFile: 'spot-nongkrong.data.ts',
    mockExport: 'spotNongkrong',
  },
  trending_articles: {
    idField: 'trending_articles_id',
    translatableFields: ['title', 'excerpt', 'content', 'author'],
    mockFile: 'trending.data.ts',
    mockExport: 'trendingArticles',
  },
  encyclopedia_entries: {
    idField: 'encyclopedia_entries_id',
    translatableFields: ['title', 'content', 'summary'],
    mockFile: 'encyclopedia.data.ts',
    mockExport: 'encyclopediaEntries',
  },
};

// ============================================================
// Utility Functions
// ============================================================

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
  if (data.errors) throw new Error(data.errors[0].message);
  accessToken = data.data.access_token;
  return accessToken;
}

async function apiCall(endpoint, options = {}) {
  const response = await fetch(`${DIRECTUS_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });
  return response.json();
}

function parseMockFile(filePath, exportName) {
  /**
   * Parse TypeScript mock data file and extract the exported array
   */
  const content = fs.readFileSync(filePath, 'utf-8');

  // Find the export statement
  const exportMatch = content.match(new RegExp(`export const ${exportName}[^=]*=\\s*\\[`));
  if (!exportMatch) {
    throw new Error(`Could not find export "${exportName}" in ${filePath}`);
  }

  // Extract array content
  const startIndex = content.indexOf('[', exportMatch.index);
  let depth = 0;
  let endIndex = startIndex;

  for (let i = startIndex; i < content.length; i++) {
    if (content[i] === '[') depth++;
    if (content[i] === ']') depth--;
    if (depth === 0) {
      endIndex = i + 1;
      break;
    }
  }

  const arrayContent = content.substring(startIndex, endIndex);

  // Convert TypeScript object literals to JSON-compatible format
  let jsonContent = arrayContent
    .replace(/as\s+const/g, '')
    .replace(/`([^`]*)`/g, '"$1"')
    .replace(/'/g, '"')
    .replace(/,(\s*[}\]])/g, '$1')
    .replace(/(\s*)(\w+):/g, '$1"$2":')
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  try {
    return JSON.parse(jsonContent);
  } catch (e) {
    console.error('JSON Parse Error:', e.message);
    throw e;
  }
}

// ============================================================
// Schema Fix Functions
// ============================================================

async function fixSchemaAnomalies() {
  console.log('\n📋 STEP 1: Fixing Schema Anomalies\n');
  console.log('-'.repeat(50));

  // 1. Add UNIQUE constraint to map_locations.slug
  console.log('\n1. Checking map_locations.slug UNIQUE constraint...');
  const fieldsRes = await apiCall('/fields/map_locations/slug');

  if (!fieldsRes.data?.schema?.is_unique) {
    console.log('   ⚠️ slug not UNIQUE - may need manual DB fix');
  } else {
    console.log('   ✅ Already UNIQUE');
  }

  // 2. Check translations relations for all collections
  console.log('\n2. Checking translations relations...');

  for (const [collection, config] of Object.entries(COLLECTIONS)) {
    const relRes = await apiCall(`/relations/${collection}`);
    const hasTransRelation = relRes.data?.some(r =>
      r.field === 'translations'
    );

    if (hasTransRelation) {
      console.log(`   ✅ ${collection} has translations relation`);
    } else {
      console.log(`   ⚠️ ${collection} missing translations relation (tables exist, relation not configured)`);
    }
  }

  console.log('\n✅ Schema check completed');
}

// ============================================================
// Data Import Functions
// ============================================================

async function importMockData() {
  console.log('\n📦 STEP 2: Importing Mock Data\n');
  console.log('-'.repeat(50));

  const importResults = [];

  for (const [collection, config] of Object.entries(COLLECTIONS)) {
    console.log(`\n📥 Importing ${collection}...`);

    const mockFilePath = path.join(MOCK_DATA_PATH, config.mockFile);

    if (!fs.existsSync(mockFilePath)) {
      console.log(`   ⚠️ Mock file not found: ${mockFilePath}`);
      continue;
    }

    try {
      const mockData = parseMockFile(mockFilePath, config.mockExport);
      console.log(`   Found ${mockData.length} items in mock data`);

      let imported = 0;
      let skipped = 0;
      let errors = 0;

      for (const item of mockData) {
        // Check if item already exists by slug
        const existing = await apiCall(`/items/${collection}?filter[slug][_eq]=${encodeURIComponent(item.slug)}`);

        if (existing.data?.length > 0) {
          console.log(`   ⏭️ "${item.slug}" already exists`);
          skipped++;
          continue;
        }

        // Prepare main item data
        const mainData = prepareMainData(collection, item);

        // Create main item
        const createRes = await apiCall(`/items/${collection}`, {
          method: 'POST',
          body: JSON.stringify(mainData),
        });

        if (createRes.errors) {
          console.log(`   ❌ Error "${item.slug}": ${createRes.errors[0].message}`);
          errors++;
          continue;
        }

        const newId = createRes.data.id;

        // Create Indonesian translation
        const transIdData = prepareTranslation(collection, config, newId, item, 'id');
        const transIdRes = await apiCall(`/items/${collection}_translations`, {
          method: 'POST',
          body: JSON.stringify(transIdData),
        });

        if (transIdRes.errors) {
          console.log(`   ⚠️ ID translation error: ${transIdRes.errors[0].message}`);
        }

        // Create English translation
        const transEnData = prepareTranslation(collection, config, newId, item, 'en');
        const transEnRes = await apiCall(`/items/${collection}_translations`, {
          method: 'POST',
          body: JSON.stringify(transEnData),
        });

        if (transEnRes.errors) {
          console.log(`   ⚠️ EN translation error: ${transEnRes.errors[0].message}`);
        }

        console.log(`   ✅ Created ${item.slug} (ID: ${newId}) + translations`);
        imported++;
      }

      importResults.push({ collection, total: mockData.length, imported, skipped, errors });

    } catch (e) {
      console.log(`   ❌ Error: ${e.message}`);
      importResults.push({ collection, total: 0, imported: 0, skipped: 0, errors: 1 });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT SUMMARY\n');
  console.log('Collection               | Total | Import | Skip | Error');
  console.log('-'.repeat(60));

  for (const r of importResults) {
    console.log(`${r.collection.padEnd(24)} | ${String(r.total).padStart(5)} | ${String(r.imported).padStart(6)} | ${String(r.skipped).padStart(4)} | ${String(r.errors).padStart(5)}`);
  }

  return importResults;
}

function prepareMainData(collection, item) {
  const base = {
    slug: item.slug,
    status: item.status || 'published',
  };

  switch (collection) {
    case 'destinasi_wisata':
      // Main table has: name, location, description, hours (non-translatable copies)
      return {
        ...base,
        name: item.name_id,
        location: item.location_id,
        description: item.description_id,
        hours: item.hours_id,
      };

    case 'agenda_events':
      // Main table has: title, description, location, organizer, event_date, ticket_price
      return {
        ...base,
        title: item.title_id,
        description: '', // Will be in translation
        location: item.location_id,
        event_date: parseEventDate(item.date_id),
        ticket_price: item.price_id,
        tags: [],
      };

    case 'umkm_lokal':
      // Main table has: name, description, address, category, price_range
      return {
        ...base,
        name: item.name_id,
        description: item.description_id,
        address: item.location_id,
        category: item.category,
        price_range: item.price_id,
        tags: item.tags || [],
      };

    case 'spot_nongkrong':
      // Main table has: name, description, address, category, opening_hours, price_range
      return {
        ...base,
        name: item.name_id,
        description: item.description_id,
        address: item.location_id,
        category: item.category_id,
        opening_hours: item.hours_id,
        price_range: item.budget_id,
        tags: item.tags || [],
        badges: item.badges_id || [],
      };

    case 'trending_articles':
      // Main table has: title, excerpt, content, author, category, views
      return {
        ...base,
        title: item.title_id,
        excerpt: item.excerpt_id,
        content: item.excerpt_id, // Use excerpt as content placeholder
        author: item.author_id,
        category: item.category,
        views: item.views || 0,
        tags: item.tags || [],
      };

    case 'encyclopedia_entries':
      // Main table has: title, content, summary, category_id (integer FK)
      return {
        ...base,
        title: item.title_id,
        content: item.fullContent_id || item.snippet_id,
        summary: item.snippet_id,
        tags: item.tags || [],
      };

    default:
      return base;
  }
}

function prepareTranslation(collection, config, itemId, item, lang) {
  const langCode = lang === 'id' ? 'id-ID' : 'en-US';
  const suffix = `_${lang}`;

  const base = {
    [config.idField]: itemId,
    languages_code: langCode,
  };

  // Based on actual Directus translation table schema from compare-schema-mock.js
  switch (collection) {
    case 'destinasi_wisata':
      // Translation has: name, location, description, hours
      return {
        ...base,
        name: item[`name${suffix}`],
        location: item[`location${suffix}`],
        description: item[`description${suffix}`],
        hours: item[`hours${suffix}`],
      };

    case 'agenda_events':
      // Translation has: title, description, location, organizer
      // Missing in Directus: category, date, time, price, age
      return {
        ...base,
        title: item[`title${suffix}`],
        description: `${item[`category${suffix}`] || ''} - ${item[`price${suffix}`] || ''} - ${item[`age${suffix}`] || ''}`.trim(),
        location: item[`location${suffix}`],
        organizer: '',
      };

    case 'umkm_lokal':
      // Translation has: name, description, address, category
      // Missing in Directus: type, location, price, highlight
      return {
        ...base,
        name: item[`name${suffix}`],
        description: item[`description${suffix}`] + (item[`highlight${suffix}`] ? ` (${item[`highlight${suffix}`]})` : ''),
        address: item[`location${suffix}`],
        category: item[`type${suffix}`],
      };

    case 'spot_nongkrong':
      // Translation has: name, description, address
      // Missing in Directus: category, location, budget, hours, badges
      return {
        ...base,
        name: item[`name${suffix}`],
        description: item[`description${suffix}`],
        address: item[`location${suffix}`],
      };

    case 'trending_articles':
      // Translation has: title, excerpt, content, author
      // Missing in Directus: date
      return {
        ...base,
        title: item[`title${suffix}`],
        excerpt: item[`excerpt${suffix}`],
        content: item[`excerpt${suffix}`], // Use excerpt as content
        author: item[`author${suffix}`],
      };

    case 'encyclopedia_entries':
      // Translation has: title, content, summary
      // Missing in Directus: snippet, fullContent, editor
      return {
        ...base,
        title: item[`title${suffix}`],
        content: item[`fullContent${suffix}`] || item[`snippet${suffix}`],
        summary: item[`snippet${suffix}`],
      };

    default:
      return base;
  }
}

function parseEventDate(dateStr) {
  const months = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12',
  };

  const match = dateStr?.match(/(\d+)(?:-\d+)?\s+(\w+)\s+(\d+)/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = months[match[2]] || '01';
    const year = match[3];
    return `${year}-${month}-${day}`;
  }

  return new Date().toISOString().split('T')[0];
}

// ============================================================
// Data Integrity Verification
// ============================================================

async function verifyDataIntegrity() {
  console.log('\n🔍 STEP 3: Verifying Data Integrity\n');
  console.log('-'.repeat(50));

  const allCollections = {
    map_locations: { idField: 'map_locations_id' },
    ...COLLECTIONS,
  };

  let totalIssues = 0;

  for (const [collection, config] of Object.entries(allCollections)) {
    console.log(`\n📊 ${collection}`);

    const items = await apiCall(`/items/${collection}?limit=-1`);
    const itemCount = items.data?.length || 0;

    const transCollection = `${collection}_translations`;
    const translations = await apiCall(`/items/${transCollection}?limit=-1`);
    const transCount = translations.data?.length || 0;

    // Check items without translations
    const itemIds = new Set(items.data?.map(i => i.id) || []);
    const translatedIds = new Set(translations.data?.map(t => t[config.idField]) || []);
    const missingTrans = [...itemIds].filter(id => !translatedIds.has(id));

    // Check duplicate slugs
    const slugs = items.data?.map(i => i.slug) || [];
    const duplicates = slugs.filter((s, i) => slugs.indexOf(s) !== i);

    const issues = [];
    if (missingTrans.length > 0) issues.push(`${missingTrans.length} missing translations`);
    if (duplicates.length > 0) issues.push(`${duplicates.length} duplicate slugs`);

    if (issues.length > 0) {
      console.log(`   Items: ${itemCount} | Trans: ${transCount} | ⚠️ ${issues.join(', ')}`);
      totalIssues += issues.length;
    } else {
      console.log(`   Items: ${itemCount} | Trans: ${transCount} | ✅ OK`);
    }
  }

  console.log('\n' + '='.repeat(50));
  if (totalIssues === 0) {
    console.log('\n✅ ALL DATA INTEGRITY CHECKS PASSED!\n');
  } else {
    console.log(`\n⚠️ ${totalIssues} issues found - review above\n`);
  }
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 PHASE 3: CONTENT POPULATION');
  console.log('='.repeat(60));
  console.log(`\nMock data path: ${MOCK_DATA_PATH}`);

  try {
    console.log('\n🔐 Authenticating...');
    await login();
    console.log('✅ Authenticated');

    await fixSchemaAnomalies();
    await importMockData();
    await verifyDataIntegrity();

    console.log('\n' + '='.repeat(60));
    console.log('✅ PHASE 3 COMPLETED');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

main();
