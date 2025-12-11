import dotenv from 'dotenv';

dotenv.config();

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN;

/**
 * Test Directus API for Next.js i18n compatibility
 *
 * The frontend uses:
 * - next-intl with locales: ['id', 'en']
 * - Directus uses codes: 'id-ID', 'en-US'
 *
 * This script verifies API works and shows transformation patterns
 */

// Map frontend locale to Directus code
const localeToCode = {
  'id': 'id-ID',
  'en': 'en-US'
};

async function testI18nAPI() {
  console.log('=== TESTING DIRECTUS I18N API FOR NEXT.JS ===\n');
  console.log(`Directus URL: ${DIRECTUS_URL}`);
  console.log(`Token: ${DIRECTUS_TOKEN ? 'Set' : 'Not set'}\n`);

  const headers = {
    'Content-Type': 'application/json',
  };
  if (DIRECTUS_TOKEN) {
    headers['Authorization'] = `Bearer ${DIRECTUS_TOKEN}`;
  }

  // Test 1: Fetch map_locations with all translations
  console.log('📋 Test 1: Fetch map_locations with all translations');
  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/map_locations?fields=*,translations.*&limit=3`,
      { headers }
    );
    const data = await res.json();
    console.log(`Found ${data.data?.length || 0} items`);

    if (data.data?.length > 0) {
      const item = data.data[0];
      console.log('\nRaw item structure:');
      console.log(`  id: ${item.id}`);
      console.log(`  category: ${item.category}`);
      console.log(`  latitude: ${item.latitude}`);
      console.log(`  translations: ${item.translations?.length || 0} languages`);

      if (item.translations?.length > 0) {
        console.log('\n  Translations:');
        item.translations.forEach(t => {
          console.log(`    [${t.code}] ${t.name}`);
        });
      }
    }
  } catch (error) {
    console.log('  ❌ Error:', error.message);
  }

  // Test 2: Fetch with deep filter for specific language (Indonesian)
  console.log('\n📋 Test 2: Fetch with deep filter (Indonesian - id-ID)');
  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/map_locations?fields=*,translations.*&deep[translations][_filter][code][_eq]=id-ID&limit=3`,
      { headers }
    );
    const data = await res.json();
    console.log(`Found ${data.data?.length || 0} items`);

    if (data.data?.length > 0) {
      const item = data.data[0];
      console.log('\nFiltered item (Indonesian only):');
      console.log(`  id: ${item.id}`);
      console.log(`  translations: ${item.translations?.length || 0}`);
      if (item.translations?.length > 0) {
        const t = item.translations[0];
        console.log(`  name: ${t.name}`);
        console.log(`  description: ${t.description?.substring(0, 80)}...`);
      }
    }
  } catch (error) {
    console.log('  ❌ Error:', error.message);
  }

  // Test 3: Fetch with deep filter for English
  console.log('\n📋 Test 3: Fetch with deep filter (English - en-US)');
  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/map_locations?fields=*,translations.*&deep[translations][_filter][code][_eq]=en-US&limit=3`,
      { headers }
    );
    const data = await res.json();
    console.log(`Found ${data.data?.length || 0} items`);

    if (data.data?.length > 0) {
      const item = data.data[0];
      console.log('\nFiltered item (English only):');
      console.log(`  id: ${item.id}`);
      console.log(`  translations: ${item.translations?.length || 0}`);
      if (item.translations?.length > 0) {
        const t = item.translations[0];
        console.log(`  name: ${t.name}`);
        console.log(`  description: ${t.description?.substring(0, 80)}...`);
      }
    }
  } catch (error) {
    console.log('  ❌ Error:', error.message);
  }

  // Test 4: Show transformation to Next.js format
  console.log('\n📋 Test 4: Transform to Next.js SiteLocation format');
  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/map_locations?fields=*,translations.*&limit=2`,
      { headers }
    );
    const data = await res.json();

    if (data.data?.length > 0) {
      console.log('\nTransformed items for Next.js:');

      data.data.forEach(item => {
        const idTrans = item.translations?.find(t => t.code === 'id-ID') || {};
        const enTrans = item.translations?.find(t => t.code === 'en-US') || {};

        const siteLocation = {
          id: item.slug || `id-${item.id}`,
          name_id: idTrans.name || '',
          name_en: enTrans.name || idTrans.name || '',
          description_id: idTrans.description || '',
          description_en: enTrans.description || idTrans.description || '',
          category: item.category,
          subcategory: item.subcategory,
          coordinates: {
            lat: item.latitude,
            lng: item.longitude
          },
          address_id: idTrans.address || '',
          address_en: enTrans.address || idTrans.address || '',
          openingHours: idTrans.opening_hours || enTrans.opening_hours,
          facilities: item.facilities || idTrans.facilities || [],
          googleMapsUrl: item.google_maps_url
        };

        console.log(`\n  ${siteLocation.id}:`);
        console.log(`    name_id: ${siteLocation.name_id}`);
        console.log(`    name_en: ${siteLocation.name_en}`);
        console.log(`    category: ${siteLocation.category}`);
        console.log(`    coordinates: (${siteLocation.coordinates.lat}, ${siteLocation.coordinates.lng})`);
      });
    }
  } catch (error) {
    console.log('  ❌ Error:', error.message);
  }

  // Test 5: Test all collections
  console.log('\n\n📋 Test 5: All Collections Summary');
  const collections = [
    { name: 'map_locations', transFields: ['name', 'description', 'address'] },
    { name: 'agenda_events', transFields: ['title', 'description', 'location', 'organizer'] },
    { name: 'umkm_lokal', transFields: ['name', 'description', 'address', 'category'] },
    { name: 'spot_nongkrong', transFields: ['name', 'description', 'address', 'category'] },
    { name: 'trending_articles', transFields: ['title', 'content', 'excerpt', 'author'] },
    { name: 'encyclopedia_entries', transFields: ['title', 'content', 'summary'] }
  ];

  for (const col of collections) {
    try {
      const res = await fetch(
        `${DIRECTUS_URL}/items/${col.name}?fields=id,translations.*&limit=1`,
        { headers }
      );
      const data = await res.json();
      const item = data.data?.[0];

      if (item && item.translations?.length > 0) {
        const langs = item.translations.map(t => t.code).join(', ');
        const fields = Object.keys(item.translations[0]).filter(k => !['id', 'code', `${col.name}_id`].includes(k));
        console.log(`\n  ${col.name}:`);
        console.log(`    Languages: ${langs}`);
        console.log(`    Translation fields: ${fields.join(', ')}`);
      } else {
        console.log(`\n  ${col.name}: No data or translations`);
      }
    } catch (error) {
      console.log(`\n  ${col.name}: ❌ ${error.message}`);
    }
  }

  // Generate example code
  console.log('\n\n=== EXAMPLE NEXT.JS API SERVICE CODE ===\n');
  console.log(`
// lib/api/directus.ts

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';

// Map next-intl locale to Directus code
const localeToCode: Record<string, string> = {
  'id': 'id-ID',
  'en': 'en-US'
};

interface DirectusItem {
  id: number;
  slug?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  translations?: Array<{
    code: string;
    name?: string;
    description?: string;
    address?: string;
    [key: string]: any;
  }>;
  [key: string]: any;
}

export async function getMapLocations(locale: string = 'id') {
  const code = localeToCode[locale] || 'id-ID';

  const res = await fetch(
    \`\${DIRECTUS_URL}/items/map_locations?fields=*,translations.*&deep[translations][_filter][code][_eq]=\${code}\`
  );
  const { data } = await res.json();

  return data.map((item: DirectusItem) => {
    const trans = item.translations?.[0] || {};
    return {
      id: item.slug || \`id-\${item.id}\`,
      name: trans.name || '',
      description: trans.description || '',
      address: trans.address || '',
      category: item.category,
      subcategory: item.subcategory,
      coordinates: { lat: item.latitude, lng: item.longitude },
      facilities: trans.facilities || item.facilities || [],
      openingHours: trans.opening_hours,
      ticketPrice: trans.ticket_price,
      googleMapsUrl: item.google_maps_url,
      // Contact info
      phone: item.phone,
      email: item.email,
      whatsapp: item.whatsapp,
      website: item.website,
      instagram: item.instagram,
      facebook: item.facebook,
    };
  });
}

// Usage in component:
// const { locale } = useLocale();
// const locations = await getMapLocations(locale);
`);

  console.log('\n✅ API testing complete!');
}

testI18nAPI().catch(console.error);
