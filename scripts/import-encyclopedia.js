import fetch from 'node-fetch';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.PUBLIC_URL || 'http://localhost:8055';
let accessToken = null;

async function login() {
  const response = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    }),
  });

  if (!response.ok) throw new Error('Login failed');
  const data = await response.json();
  accessToken = data.data.access_token;
}

async function directusRequest(endpoint, options = {}) {
  const url = `${DIRECTUS_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(error)}`);
  }

  return response.json();
}

async function importEncyclopedia() {
  console.log('📚 Importing Encyclopedia Entries...\n');

  await login();

  // Read file and extract data manually
  const tsFilePath = 'D:\\Dev\\next-budaya\\filosofi-yogya-mod\\lib\\data\\mock\\encyclopedia.data.ts';
  const tsContent = readFileSync(tsFilePath, 'utf-8');

  // Extract just the array content (between [ and ];)
  const pattern = 'export const encyclopediaEntries';
  const arrayStart = tsContent.indexOf(pattern);

  if (arrayStart === -1) {
    throw new Error('Could not find encyclopediaEntries declaration');
  }

  const startBracket = tsContent.indexOf('[', arrayStart);
  // Find FIRST ]; after the start bracket (not last, to avoid including categories array)
  const endBracket = tsContent.indexOf('];', startBracket);

  if (startBracket === -1 || endBracket === -1) {
    throw new Error('Could not find array bounds');
  }

  const arrayContent = tsContent.substring(startBracket + 1, endBracket);

  let encyclopediaEntries;
  try {
    eval('encyclopediaEntries = [' + arrayContent + '];');
  } catch (error) {
    throw new Error(`Failed to parse array: ${error.message}`);
  }
  console.log(`✅ Loaded ${encyclopediaEntries.length} entries\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const item of encyclopediaEntries) {
    try {
      console.log(`   📖 ${item.slug}...`);

      // Create main record (Indonesian)
      const mainData = {
        slug: item.slug,
        title: item.title_id,
        content: item.fullContent_id,
        summary: item.snippet_id,
        category_id: null, // Will need to create categories separately
        tags: item.tags || null,
        status: 'published'
      };

      const createResult = await directusRequest('/items/encyclopedia_entries', {
        method: 'POST',
        body: JSON.stringify(mainData)
      });

      const createdId = createResult.data.id;

      // Create English translation
      const translationData = {
        encyclopedia_entries_id: createdId,
        languages_code: 'en-US',
        title: item.title_en,
        content: item.fullContent_en,
        summary: item.snippet_en
      };

      await directusRequest('/items/encyclopedia_entries_translations', {
        method: 'POST',
        body: JSON.stringify(translationData)
      });

      console.log(`      ✅ Imported (ID: ${createdId})`);
      successCount++;

    } catch (error) {
      console.log(`      ❌ Error: ${error.message.substring(0, 100)}`);
      errorCount++;
    }
  }

  console.log(`\n📊 Encyclopedia: ${successCount}/${encyclopediaEntries.length} imported`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);

  if (successCount > 0) {
    console.log('\n✅ Encyclopedia import complete!');
  }
}

importEncyclopedia().catch(console.error);
