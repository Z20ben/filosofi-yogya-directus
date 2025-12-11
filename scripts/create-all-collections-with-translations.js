import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

// Collections configuration
const collections = [
  {
    name: 'destinasi_wisata',
    translatable_fields: ['name', 'location', 'description', 'hours'],
    schema: `
      CREATE TABLE IF NOT EXISTS destinasi_wisata (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        location VARCHAR(255),
        description TEXT,
        hours VARCHAR(255),
        image UUID,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        status VARCHAR(20) DEFAULT 'draft',
        sort INTEGER,
        date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        date_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `
  },
  {
    name: 'agenda_events',
    translatable_fields: ['title', 'description', 'location', 'organizer'],
    schema: `
      CREATE TABLE IF NOT EXISTS agenda_events (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(255),
        description TEXT,
        location VARCHAR(255),
        organizer VARCHAR(255),
        event_date DATE,
        start_time TIME,
        end_time TIME,
        image UUID,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        ticket_price VARCHAR(255),
        tags JSON,
        status VARCHAR(20) DEFAULT 'draft',
        sort INTEGER,
        date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        date_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `
  },
  {
    name: 'umkm_lokal',
    translatable_fields: ['name', 'description', 'address', 'category'],
    schema: `
      CREATE TABLE IF NOT EXISTS umkm_lokal (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        description TEXT,
        address VARCHAR(255),
        category VARCHAR(255),
        image UUID,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        phone VARCHAR(50),
        whatsapp VARCHAR(50),
        instagram VARCHAR(255),
        facebook VARCHAR(255),
        website VARCHAR(255),
        opening_hours VARCHAR(255),
        price_range VARCHAR(50),
        tags JSON,
        status VARCHAR(20) DEFAULT 'draft',
        sort INTEGER,
        date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        date_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `
  },
  {
    name: 'spot_nongkrong',
    translatable_fields: ['name', 'description', 'address'],
    schema: `
      CREATE TABLE IF NOT EXISTS spot_nongkrong (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        description TEXT,
        address VARCHAR(255),
        image UUID,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        category VARCHAR(255),
        opening_hours VARCHAR(255),
        price_range VARCHAR(50),
        facilities JSON,
        tags JSON,
        badges JSON,
        phone VARCHAR(50),
        instagram VARCHAR(255),
        status VARCHAR(20) DEFAULT 'draft',
        sort INTEGER,
        date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        date_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `
  },
  {
    name: 'trending_articles',
    translatable_fields: ['title', 'excerpt', 'content', 'author'],
    schema: `
      CREATE TABLE IF NOT EXISTS trending_articles (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(255),
        excerpt TEXT,
        content TEXT,
        author VARCHAR(255),
        image UUID,
        category VARCHAR(255),
        tags JSON,
        views INTEGER DEFAULT 0,
        published_date DATE,
        status VARCHAR(20) DEFAULT 'draft',
        sort INTEGER,
        date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        date_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `
  },
  {
    name: 'encyclopedia_entries',
    translatable_fields: ['title', 'content', 'summary'],
    schema: `
      CREATE TABLE IF NOT EXISTS encyclopedia_entries (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(255),
        content TEXT,
        summary TEXT,
        image UUID,
        category_id INTEGER,
        tags JSON,
        status VARCHAR(20) DEFAULT 'draft',
        sort INTEGER,
        date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        date_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `
  }
];

async function createAllCollections() {
  console.log('🏗️  Creating All Collections with Translations...\n');

  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    for (const collection of collections) {
      console.log(`📦 Creating ${collection.name}...`);

      // 1. Create main table
      console.log(`   1️⃣ Creating main table...`);
      await client.query(collection.schema);
      console.log(`   ✅ Main table created`);

      // 2. Create translations table
      console.log(`   2️⃣ Creating translations table...`);

      const translationsSchema = `
        CREATE TABLE IF NOT EXISTS ${collection.name}_translations (
          id SERIAL PRIMARY KEY,
          ${collection.name}_id INTEGER REFERENCES ${collection.name}(id) ON DELETE CASCADE,
          languages_code VARCHAR(255) REFERENCES directus_languages(code) ON DELETE CASCADE,
          ${collection.translatable_fields.map(field => `${field} TEXT`).join(',\n          ')},
          UNIQUE(${collection.name}_id, languages_code)
        );
      `;

      await client.query(translationsSchema);
      console.log(`   ✅ Translations table created`);

      // 3. Create relations
      console.log(`   3️⃣ Creating relations...`);

      // O2M relation
      await client.query(`
        INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, junction_field)
        VALUES ($1, $2, $3, 'translations', 'languages_code')
        ON CONFLICT DO NOTHING;
      `, [`${collection.name}_translations`, `${collection.name}_id`, collection.name]);

      // M2O relation to languages
      await client.query(`
        INSERT INTO directus_relations (many_collection, many_field, one_collection)
        VALUES ($1, 'languages_code', 'directus_languages')
        ON CONFLICT DO NOTHING;
      `, [`${collection.name}_translations`]);

      console.log(`   ✅ Relations created`);

      // 4. Mark translatable fields
      console.log(`   4️⃣ Marking translatable fields...`);

      for (const field of collection.translatable_fields) {
        // Update if exists, otherwise skip (Directus will auto-create fields)
        await client.query(`
          UPDATE directus_fields
          SET special = ARRAY['translations']::text[]
          WHERE collection = $1 AND field = $2;
        `, [collection.name, field]);
      }

      console.log(`   ✅ Fields marked as translatable`);
      console.log(`   ✅ ${collection.name} complete!\n`);
    }

    console.log('✅ All collections created successfully!\n');
    console.log('📋 Next steps:');
    console.log('   1. Restart Directus');
    console.log('   2. Hard refresh browser');
    console.log('   3. Check collections in Data Studio');
    console.log('   4. Import data');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

createAllCollections().catch(console.error);
