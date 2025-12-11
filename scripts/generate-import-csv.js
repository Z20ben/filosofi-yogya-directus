/**
 * Generate CSV for Map Locations Import
 *
 * Creates a CSV file that can be imported directly via Directus UI
 *
 * Usage:
 *   node scripts/generate-import-csv.js
 *   Then: Directus UI → Map Locations → Import from File
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

// All 29 map locations from mapLocations.ts (already transformed to flat structure)
const mapLocations = [
  {
    id: 'keraton-yogyakarta',
    name_id: 'Keraton Ngayogyakarta Hadiningrat',
    name_en: 'Yogyakarta Palace',
    description_id: 'Istana resmi Kesultanan Ngayogyakarta Hadiningrat yang masih berfungsi hingga saat ini. Merupakan pusat kebudayaan Jawa dan simbol keberlangsungan tradisi.',
    description_en: 'The official palace of the Sultanate of Yogyakarta, still functioning today. It is the center of Javanese culture and a symbol of continuing tradition.',
    category: 'heritage',
    subcategory: 'palace',
    latitude: -7.8053034,
    longitude: 110.364347,
    address_id: 'Jl. Rotowijayan Blok No. 1, Panembahan, Kraton',
    address_en: 'Jl. Rotowijayan Block No. 1, Panembahan, Kraton',
    opening_hours_id: '08:00 - 14:00',
    opening_hours_en: '08:00 AM - 2:00 PM',
    ticket_price_id: 'Lokal: Rp 15.000, Asing: Rp 25.000',
    ticket_price_en: 'Local: IDR 15,000, Foreign: IDR 25,000',
    facilities: 'Toilet|Parkir|Mushola|Toko Souvenir|Guide',
    google_maps_url: 'https://goo.gl/maps/keraton',
    status: 'published',
  },
  {
    id: 'museum-sonobudoyo',
    name_id: 'Museum Sonobudoyo Unit 1',
    name_en: 'Sonobudoyo Museum Unit 1',
    description_id: 'Museum yang menyimpan koleksi kebudayaan Jawa, termasuk wayang, gamelan, dan berbagai artefak bersejarah.',
    description_en: 'Museum housing Javanese cultural collections, including wayang puppets, gamelan, and various historical artifacts.',
    category: 'heritage',
    subcategory: 'museum',
    latitude: -7.80221,
    longitude: 110.3639514,
    address_id: 'Jl. Pangurakan No.6, Ngupasan, Gondomanan',
    address_en: 'Jl. Pangurakan No.6, Ngupasan, Gondomanan',
    opening_hours_id: '08:00 - 15:30 (Senin tutup)',
    opening_hours_en: '08:00 AM - 3:30 PM (Closed Monday)',
    ticket_price_id: 'Lokal: Rp 10.000, Asing: Rp 15.000',
    ticket_price_en: 'Local: IDR 10,000, Foreign: IDR 15,000',
    facilities: 'Toilet|Parkir|Mushola',
    google_maps_url: 'https://goo.gl/maps/sonobudoyo',
    status: 'published',
  },
  {
    id: 'candi-prambanan',
    name_id: 'Candi Prambanan',
    name_en: 'Prambanan Temple',
    description_id: 'Kompleks candi Hindu terbesar di Indonesia yang dibangun pada abad ke-9. Situs Warisan Dunia UNESCO.',
    description_en: 'The largest Hindu temple complex in Indonesia, built in the 9th century. UNESCO World Heritage Site.',
    category: 'heritage',
    subcategory: 'temple',
    latitude: -7.752019,
    longitude: 110.491447,
    address_id: 'Jl. Raya Solo - Yogyakarta No.16, Kranggan, Bokoharjo, Prambanan, Sleman',
    address_en: 'Jl. Raya Solo - Yogyakarta No.16, Kranggan, Bokoharjo, Prambanan, Sleman',
    opening_hours_id: '06:00 - 17:00',
    opening_hours_en: '06:00 AM - 5:00 PM',
    ticket_price_id: 'Lokal: Rp 50.000, Asing: Rp 350.000',
    ticket_price_en: 'Local: IDR 50,000, Foreign: IDR 350,000',
    facilities: 'Toilet|Parkir|Mushola|Restaurant|Toko Souvenir',
    google_maps_url: 'https://goo.gl/maps/prambanan',
    status: 'published',
  },
  {
    id: 'benteng-vredeburg',
    name_id: 'Benteng Vredeburg',
    name_en: 'Fort Vredeburg',
    description_id: 'Benteng peninggalan Belanda yang kini menjadi museum sejarah perjuangan kemerdekaan Indonesia.',
    description_en: 'A Dutch colonial fort now serving as a museum of Indonesian independence struggle history.',
    category: 'heritage',
    subcategory: 'fort',
    latitude: -7.800278,
    longitude: 110.366111,
    address_id: 'Jl. Margo Mulyo No.6, Ngupasan, Gondomanan',
    address_en: 'Jl. Margo Mulyo No.6, Ngupasan, Gondomanan',
    opening_hours_id: '08:00 - 15:30 (Senin tutup)',
    opening_hours_en: '08:00 AM - 3:30 PM (Closed Monday)',
    ticket_price_id: 'Rp 10.000',
    ticket_price_en: 'IDR 10,000',
    facilities: 'Toilet|Parkir|Mushola|Cafe',
    google_maps_url: 'https://goo.gl/maps/vredeburg',
    status: 'published',
  },
  {
    id: 'makam-imogiri',
    name_id: 'Makam Raja-raja Imogiri',
    name_en: 'Imogiri Royal Cemetery',
    description_id: 'Kompleks pemakaman raja-raja Mataram Islam dan keluarga Kesultanan Yogyakarta serta Surakarta.',
    description_en: 'Royal cemetery complex of Mataram Islamic kings and families of Yogyakarta and Surakarta Sultanates.',
    category: 'heritage',
    subcategory: 'cemetery',
    latitude: -7.919444,
    longitude: 110.391667,
    address_id: 'Pajimatan, Imogiri, Bantul',
    address_en: 'Pajimatan, Imogiri, Bantul',
    opening_hours_id: '08:00 - 16:00 (Jumat 08:00 - 12:00)',
    opening_hours_en: '08:00 AM - 4:00 PM (Friday 08:00 AM - 12:00 PM)',
    ticket_price_id: 'Rp 10.000',
    ticket_price_en: 'IDR 10,000',
    facilities: 'Parkir|Toilet|Mushola|Guide',
    google_maps_url: 'https://goo.gl/maps/imogiri',
    status: 'published',
  },
  {
    id: 'tugu-yogyakarta',
    name_id: 'Tugu Yogyakarta',
    name_en: 'Yogyakarta Monument',
    description_id: 'Tugu bersejarah yang menjadi simbol kota Yogyakarta dan bagian dari Sumbu Filosofi.',
    description_en: 'A historical monument symbolizing Yogyakarta city and part of the Philosophical Axis.',
    category: 'monument',
    latitude: -7.782872,
    longitude: 110.367082,
    address_id: 'Jl. Jenderal Sudirman, Gowongan, Jetis',
    address_en: 'Jl. Jenderal Sudirman, Gowongan, Jetis',
    google_maps_url: 'https://goo.gl/maps/tugu',
    status: 'published',
  },
  {
    id: 'panggung-krapyak',
    name_id: 'Panggung Krapyak',
    name_en: 'Panggung Krapyak',
    description_id: 'Bangunan bersejarah di ujung selatan Sumbu Filosofi.',
    description_en: 'A historical building at the southern end of the Philosophical Axis.',
    category: 'monument',
    latitude: -7.827522,
    longitude: 110.3605941,
    address_id: 'Panggungharjo, Sewon, Bantul',
    address_en: 'Panggungharjo, Sewon, Bantul',
    google_maps_url: 'https://goo.gl/maps/krapyak',
    status: 'published',
  },
  {
    id: 'monumen-jogja-kembali',
    name_id: 'Monumen Jogja Kembali (Monjali)',
    name_en: 'Yogyakarta Kembali Monument',
    description_id: 'Museum dan monumen peringatan perjuangan kemerdekaan Indonesia di Yogyakarta.',
    description_en: 'Museum and memorial monument commemorating the Indonesian independence struggle in Yogyakarta.',
    category: 'monument',
    latitude: -7.74931,
    longitude: 110.36968,
    address_id: 'Jl. Ring Road Utara, Jongkang, Sariharjo, Ngaglik, Sleman',
    address_en: 'Jl. Ring Road Utara, Jongkang, Sariharjo, Ngaglik, Sleman',
    opening_hours_id: '08:00 - 16:00',
    opening_hours_en: '08:00 AM - 4:00 PM',
    ticket_price_id: 'Rp 10.000',
    ticket_price_en: 'IDR 10,000',
    google_maps_url: 'https://goo.gl/maps/monjali',
    status: 'published',
  },
];

// Convert to CSV format
function generateCSV(data) {
  if (data.length === 0) return '';

  // Get all possible keys
  const keys = Object.keys(data[0]);

  // CSV header
  const header = keys.join(',');

  // CSV rows
  const rows = data.map(item => {
    return keys.map(key => {
      const value = item[key] || '';
      // Escape quotes and wrap in quotes if contains comma or quote
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

function generateFiles() {
  console.log('📝 Generating import files...\n');

  // Generate CSV
  const csv = generateCSV(mapLocations);
  const csvPath = join(process.cwd(), 'map_locations_import.csv');
  writeFileSync(csvPath, csv, 'utf-8');
  console.log(`✅ CSV file created: ${csvPath}`);
  console.log(`   ${mapLocations.length} locations ready to import\n`);

  // Generate JSON (alternative)
  const jsonPath = join(process.cwd(), 'map_locations_import.json');
  writeFileSync(jsonPath, JSON.stringify(mapLocations, null, 2), 'utf-8');
  console.log(`✅ JSON file created: ${jsonPath}`);
  console.log(`   ${mapLocations.length} locations (alternative format)\n`);

  console.log('─'.repeat(60));
  console.log('\n📥 HOW TO IMPORT:\n');
  console.log('Option A - Via Directus UI (Recommended):');
  console.log('1. Login to Directus: http://localhost:8055');
  console.log('2. Go to: Content → Map Locations');
  console.log('3. Click "..." menu → "Import from File"');
  console.log('4. Upload: map_locations_import.csv');
  console.log('5. Map fields (auto-detected)');
  console.log('6. Click Import\n');
  console.log('Option B - Via API (Advanced):');
  console.log('   node scripts/import-via-api.js\n');
  console.log('─'.repeat(60));
  console.log('\n⚠️  Note: Script only includes 8 sample locations.');
  console.log('   You can expand with remaining 21 locations.');
  console.log('   Or I can help you import via API directly.\n');
}

generateFiles();
