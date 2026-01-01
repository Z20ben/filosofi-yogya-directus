# Filosofi Yogya - Directus CMS Development Skill

## Project Context
**Project Name:** filosofi-yogya-directus  
**Purpose:** Backend CMS dan API untuk filosofi-yogya-mod frontend  
**Repository:** https://github.com/Z20ben/filosofi-yogya-directus  
**CMS Platform:** Directus (Headless CMS)  
**Admin Panel:** http://localhost:8055 (development)

---

## Tech Stack

### Core Platform
- **Directus:** Headless CMS untuk content management
- **Database:** PostgreSQL >= 12
- **Node.js:** >= 22 (managed with fnm)
- **Package Manager:** npm >= 10

### Why Directus?
- ✅ **Headless CMS** - API-first approach
- ✅ **Database-agnostic** - Works with existing/new databases
- ✅ **Auto-generated API** - REST & GraphQL out of the box
- ✅ **Real-time** - WebSocket support
- ✅ **No-code Dashboard** - Easy untuk non-technical users
- ✅ **Extensible** - Custom extensions support
- ✅ **Bilingual Support** - Perfect untuk Indonesian/English content

---

## Project Structure (DETECTED PATTERN)

```
filosofi-yogya-directus/
├── scripts/              # Helper scripts (setup, migration, etc.)
│   └── (migration scripts, data seeding)
├── .env.example         # Environment variables template
├── .env                 # Actual environment (NOT committed)
├── .gitignore          
├── README.md           # Setup & usage documentation
├── SETUP.md            # Detailed setup guide
├── package.json        # Directus dependencies
├── package-lock.json
├── start.bat           # Windows startup script
└── start.sh            # Git Bash startup script (RECOMMENDED)
```

### CRITICAL: Git Bash Requirement
⚠️ **ALWAYS use Git Bash** untuk run Directus, NEVER CMD/PowerShell/WSL!
- Reason: fnm (Fast Node Manager) compatibility
- Path handling consistency
- Shell script execution

---

## Environment Configuration

### Required Environment Variables (.env)

```bash
# Core Settings
PORT=8055
PUBLIC_URL=http://localhost:8055

# Database Configuration (PostgreSQL)
DB_CLIENT=pg
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=filosofi_yogya_directus
DB_USER=postgres
DB_PASSWORD=your_actual_postgres_password

# Security Keys (MUST GENERATE UNIQUE VALUES!)
# Generate with: openssl rand -base64 32
KEY=generate_random_32_char_key_here
SECRET=generate_random_32_char_secret_here

# Admin Account (First Bootstrap)
ADMIN_EMAIL=admin@filosofi-yogya.local
ADMIN_PASSWORD=SecurePassword123!

# CORS (if needed for frontend)
CORS_ENABLED=true
CORS_ORIGIN=http://localhost:3000

# Extensions (if using custom extensions)
EXTENSIONS_PATH=./extensions

# File Storage
STORAGE_LOCATIONS=local
STORAGE_LOCAL_ROOT=./uploads

# Rate Limiting (optional but recommended)
RATE_LIMITER_ENABLED=true
RATE_LIMITER_POINTS=50
RATE_LIMITER_DURATION=1

# Cache (optional for performance)
CACHE_ENABLED=true
CACHE_TTL=30m
```

### CRITICAL SECURITY RULES
- ❌ NEVER commit `.env` to Git
- ❌ NEVER use default/weak passwords
- ❌ NEVER reuse KEY and SECRET across environments
- ✅ ALWAYS generate unique keys: `openssl rand -base64 32`
- ✅ ALWAYS use strong admin password
- ✅ ALWAYS change default credentials in production

---

## Database Setup

### PostgreSQL Database Creation

**Option 1: Command Line (psql)**
```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE filosofi_yogya_directus;

# Create dedicated user (RECOMMENDED for production)
CREATE USER directus_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE filosofi_yogya_directus TO directus_user;

# Exit
\q
```

**Option 2: pgAdmin GUI**
1. Right-click on "Databases"
2. Create → Database
3. Name: `filosofi_yogya_directus`
4. Owner: `postgres` or dedicated user
5. Click "Save"

### Database Connection String Pattern
```
postgresql://[user]:[password]@[host]:[port]/[database]

Example:
postgresql://postgres:mypassword@localhost:5432/filosofi_yogya_directus
```

---

## Development Workflow

### Initial Setup (First Time Only)

```bash
# 1. Clone repository
git clone https://github.com/Z20ben/filosofi-yogya-directus.git
cd filosofi-yogya-directus

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env dengan kredensial yang benar

# 4. Generate security keys
openssl rand -base64 32  # Copy to KEY
openssl rand -base64 32  # Copy to SECRET

# 5. Create PostgreSQL database (see Database Setup above)

# 6. Bootstrap Directus (create tables & admin user)
npx directus bootstrap

# 7. Start development server
npm start
```

### Daily Development Workflow

**Method 1: Using Start Script (RECOMMENDED)**
```bash
# Open Git Bash
cd /path/to/filosofi-yogya-directus
./start.sh
```

**Method 2: Manual Start**
```bash
# 1. Open Git Bash
cd /path/to/filosofi-yogya-directus

# 2. Ensure correct Node version
fnm use 22
node --version  # Should show v22.x.x

# 3. Start Directus
npm start
```

**Access Admin Panel:**
- URL: http://localhost:8055
- Email: (dari ADMIN_EMAIL di .env)
- Password: (dari ADMIN_PASSWORD di .env)

**Stop Server:**
- Press `Ctrl + C` in Git Bash terminal

---

## Content Modeling (Collections)

### Detected Data Model (from Frontend Mock Data)

Based on mock data reference in README, these collections should be created:

#### 1. **map_locations** (Heritage Locations)
```typescript
// Collection: map_locations
// Uses Directus Translations for bilingual content

interface MapLocation {
  id: string;                    // UUID or auto-increment
  status: 'published' | 'draft'; // Directus system field
  
  // Base fields (fallback/default language)
  title: string;                 // Base title
  description: string;           // Text/WYSIWYG - Base description
  
  // Translations (auto-managed by Directus)
  translations: MapLocationTranslation[];
  
  // Location Data (non-translatable)
  latitude: number;              // Decimal
  longitude: number;             // Decimal
  address: string;
  
  // Media
  images: M2M<directus_files>;   // Many-to-Many relationship
  featured_image: O2M<directus_files>; // One-to-Many
  
  // Metadata
  category: string;              // monument, palace, temple, etc.
  
  // Translatable metadata
  historical_significance: string; // Base field with translations
  
  // System Fields (auto-generated by Directus)
  date_created: datetime;
  date_updated: datetime;
  user_created: uuid;
  user_updated: uuid;
}

// Auto-generated translation table
interface MapLocationTranslation {
  id: number;
  map_locations_id: string;      // FK to map_locations
  languages_code: 'id-ID' | 'en-US';
  
  // Translated fields
  title: string;
  description: string;
  historical_significance: string;
}
```

**Fields with Translations Enabled:**
- `title`
- `description`
- `historical_significance`

**Non-translatable Fields:**
- `latitude`, `longitude` (numbers are universal)
- `address` (optional: could be translatable if needed)
- `category` (using keys, translated in frontend)
- `images` (media is universal)

#### 2. **agenda_events**
```typescript
interface AgendaEvent {
  id: string;
  status: 'published' | 'draft';
  
  // Bilingual Content
  title_id: string;
  title_en: string;
  description_id: string;
  description_en: string;
  
  // Event Details
  start_date: datetime;
  end_date: datetime;
  location: string;
  location_reference: M2O<map_locations>; // Reference to map_locations
  
  // Media
  poster_image: O2M<directus_files>;
  gallery: M2M<directus_files>;
  
  // Metadata
  category: string;              // festival, exhibition, ceremony
  is_recurring: boolean;
  
  // System Fields
  date_created: datetime;
  date_updated: datetime;
}
```

#### 3. **destinasi_wisata** (Tourist Destinations)
```typescript
interface DestinasiWisata {
  id: string;
  status: 'published' | 'draft';
  
  // Bilingual
  name_id: string;
  name_en: string;
  description_id: string;
  description_en: string;
  
  // Details
  location: M2O<map_locations>;
  category: string;              // kuliner, budaya, alam, etc.
  opening_hours: json;           // Flexible hours structure
  ticket_price: decimal;
  
  // Media
  images: M2M<directus_files>;
  
  // System Fields
  date_created: datetime;
  date_updated: datetime;
}
```

#### 4. **spot_nongkrong** (Hangout Spots)
```typescript
interface SpotNongkrong {
  id: string;
  status: 'published' | 'draft';
  
  name_id: string;
  name_en: string;
  description_id: string;
  description_en: string;
  
  location: M2O<map_locations>;
  category: string;              // cafe, taman, etc.
  vibe: string[];                // array: 'cozy', 'instagrammable', etc.
  
  // Amenities
  wifi_available: boolean;
  parking_available: boolean;
  
  images: M2M<directus_files>;
  
  date_created: datetime;
  date_updated: datetime;
}
```

#### 5. **trending_articles**
```typescript
interface TrendingArticle {
  id: string;
  status: 'published' | 'draft';
  
  // Bilingual
  title_id: string;
  title_en: string;
  content_id: string;            // WYSIWYG/Markdown
  content_en: string;
  slug: string;                  // For URL
  
  // Media
  featured_image: O2M<directus_files>;
  
  // Metadata
  category: string;
  tags: M2M<tags>;
  author: M2O<directus_users>;
  
  // SEO
  meta_title: string;
  meta_description: string;
  
  // Stats
  views: integer;
  
  date_created: datetime;
  date_updated: datetime;
  date_published: datetime;
}
```

#### 6. **encyclopedia**
```typescript
interface Encyclopedia {
  id: string;
  status: 'published' | 'draft';
  
  // Bilingual
  term_id: string;
  term_en: string;
  definition_id: string;
  definition_en: string;
  
  // Organization
  category: M2O<encyclopedia_categories>;
  related_terms: M2M<encyclopedia>; // Self-referencing
  
  // Media
  images: M2M<directus_files>;
  
  date_created: datetime;
  date_updated: datetime;
}

interface EncyclopediaCategory {
  id: string;
  name_id: string;
  name_en: string;
  slug: string;
}
```

#### 7. **umkm_lokal** (Local UMKM/SME)
```typescript
interface UMKMLokal {
  id: string;
  status: 'published' | 'draft';
  
  // Bilingual
  business_name: string;
  description_id: string;
  description_en: string;
  
  // Business Info
  category: string;              // kuliner, kerajinan, etc.
  location: M2O<map_locations>;
  contact_phone: string;
  contact_whatsapp: string;
  social_media: json;            // {instagram, facebook, etc.}
  
  // Products
  products: M2M<umkm_products>;
  
  // Media
  logo: O2M<directus_files>;
  photos: M2M<directus_files>;
  
  date_created: datetime;
  date_updated: datetime;
}
```

---

## Bilingual Content Strategy (DIRECTUS TRANSLATIONS)

### Pattern: Native Directus Translations ✅

**Using Directus Built-in Translation System**

Directus provides a powerful native translation system that:
- ✅ Scalable - Easy to add new languages without schema changes
- ✅ Clean data model - No duplicate fields
- ✅ Better management - Translation UI in admin panel
- ✅ Proper relationships - Normalized database structure
- ✅ Future-proof - Add more languages anytime

**Languages Configured:**
- `id-ID` - Indonesian (Bahasa Indonesia)
- `en-US` - English (United States)

### How Directus Translations Work

**Structure:**
```
Main Collection (e.g., map_locations):
├── id
├── status
├── title (base/fallback field)
├── description (base/fallback field)
├── latitude
├── longitude
└── translations → [M2M junction table]

Auto-generated Translation Table (map_locations_translations):
├── id
├── map_locations_id (FK to main collection)
├── languages_code (FK: 'id-ID' or 'en-US')
├── title (translated value)
├── description (translated value)
```

**Admin Panel Usage:**
1. Create item in main collection
2. Fill in base fields (can be in primary language)
3. Click "Translations" tab
4. Add translation for each language
5. Fill translated fields

**No Custom Configuration Needed!**
Directus handles everything automatically when you enable translations on fields.

---

## API Patterns (WITH DIRECTUS TRANSLATIONS)

### Directus REST API

**Base URL:** `http://localhost:8055`

#### Get All Items (with Translations)
```bash
# Get all items with all translations
GET /items/map_locations?fields=*,translations.*

# Get items with specific language only
GET /items/map_locations?fields=*,translations.*&filter[translations][languages_code][_eq]=id-ID
```

#### Get Single Item (with Translations)
```bash
# Get single item with all translations
GET /items/map_locations/1?fields=*,translations.*

# Get single item with specific language
GET /items/map_locations/1?fields=*,translations.*&filter[translations][languages_code][_eq]=en-US
```

#### Filter by Translated Content
```bash
# Search in translated title (Indonesian)
GET /items/map_locations?fields=*,translations.*&filter[translations][title][_contains]=keraton&filter[translations][languages_code][_eq]=id-ID

# Filter by status and get translations
GET /items/map_locations?filter[status][_eq]=published&fields=*,translations.*
```

#### Deep Filtering with Translations
```bash
# Using deep parameter for cleaner queries
GET /items/map_locations?deep[translations][_filter][languages_code][_eq]=id-ID&fields=*,translations.*
```

### Common Query Patterns

#### Get Published Heritage Locations (Specific Language)
```bash
GET /items/map_locations?\
  filter[status][_eq]=published&\
  fields=id,title,latitude,longitude,images.*,translations.*&\
  filter[translations][languages_code][_eq]=id-ID&\
  sort=-date_created
```

#### Get All Languages for Single Item
```bash
GET /items/map_locations/1?\
  fields=*,translations.*
  
# Response includes all translations:
{
  "id": 1,
  "title": "Keraton Yogyakarta",
  "latitude": -7.805,
  "longitude": 110.364,
  "translations": [
    {
      "languages_code": "id-ID",
      "title": "Keraton Yogyakarta",
      "description": "Istana resmi Kesultanan..."
    },
    {
      "languages_code": "en-US", 
      "title": "Yogyakarta Palace",
      "description": "The official palace of..."
    }
  ]
}
```

#### Get Upcoming Events (with Translations)
```bash
GET /items/agenda_events?\
  filter[start_date][_gte]=$NOW&\
  filter[status][_eq]=published&\
  fields=*,translations.*&\
  filter[translations][languages_code][_eq]=en-US&\
  sort=start_date
```

#### Pagination with Translations
```bash
GET /items/trending_articles?\
  limit=10&\
  page=2&\
  fields=*,translations.*,featured_image.*&\
  filter[translations][languages_code][_eq]=id-ID
```

---

## Permissions & Roles

### Public API Access (for Frontend)

**Setup Pattern:**
1. Go to Settings → Roles & Permissions
2. Create/Edit "Public" role
3. For each collection, set permissions:
   - **Read:** ✅ All items (with filter: `status = published`)
   - **Create:** ❌
   - **Update:** ❌
   - **Delete:** ❌

**Field Permissions:**
- ✅ Allow read on all public fields
- ❌ Hide: `user_created`, `user_updated` (sensitive)

### Admin Role
- Full CRUD access to all collections
- Can manage users, roles, settings
- Can import/export data

---

## File & Asset Management

### Image Upload Pattern

**Directus Files Collection:**
- All uploaded files go to `directus_files` collection
- Automatic thumbnail generation
- CDN-ready URLs

**Integration with Collections:**
```typescript
// Single image (One-to-Many)
featured_image: {
  type: 'uuid',
  relationship: 'o2m',
  related_collection: 'directus_files'
}

// Multiple images (Many-to-Many)
gallery: {
  type: 'alias',
  relationship: 'm2m',
  junction_collection: 'collection_files',
  related_collection: 'directus_files'
}
```

### Image Transformation API

Directus provides automatic image transformations:

```bash
# Original
/assets/{file_id}

# Resized
/assets/{file_id}?width=800&height=600

# Thumbnail
/assets/{file_id}?key=thumbnail

# Fit modes
/assets/{file_id}?fit=cover&width=400&height=300
```

### Frontend Integration
```typescript
// Next.js Image component
const imageUrl = `${DIRECTUS_URL}/assets/${image.id}?width=800&height=600&fit=cover`;

<Image 
  src={imageUrl}
  alt={image.title}
  width={800}
  height={600}
/>
```

---

## Data Migration Strategy

### Step 1: Create Collections in Directus

Use Admin Panel or Schema API to create collections matching the data models above.

### Step 2: Prepare Mock Data

Mock data location (from frontend repo):
```
../filosofi-yogya-mod/lib/data/mock/
├── mapLocations.ts       (29 items)
├── agendaEvents.ts       (5 items)
├── destinasiWisata.ts    (5 items)
├── spotNongkrong.ts      (6 items)
├── trendingArticles.ts   (6 items)
├── encyclopedia.ts       (6 entries + 6 categories)
└── umkmLokal.ts          (6 items)
```

### Step 3: Migration Script Pattern

**Create:** `scripts/migrate-mock-data.js`

```javascript
// scripts/migrate-mock-data.js
const { Directus } = require('@directus/sdk');

const directus = new Directus('http://localhost:8055', {
  auth: {
    staticToken: 'ADMIN_TOKEN_HERE' // Get from Directus admin panel
  }
});

async function migrateMockData() {
  // Read mock data from frontend repo
  const mockMapLocations = require('../../filosofi-yogya-mod/lib/data/mock/mapLocations');
  
  // Transform to Directus format
  const transformedData = mockMapLocations.map(item => ({
    title_id: item.title,
    title_en: item.titleEn || item.title,
    description_id: item.description,
    description_en: item.descriptionEn || item.description,
    latitude: item.coordinates.lat,
    longitude: item.coordinates.lng,
    category: item.category,
    status: 'published'
  }));
  
  // Bulk insert
  await directus.items('map_locations').createMany(transformedData);
  
  console.log(`✅ Migrated ${transformedData.length} map locations`);
}

migrateMockData().catch(console.error);
```

### Step 4: Run Migration
```bash
node scripts/migrate-mock-data.js
```

---

## Frontend Integration

### Directus SDK Installation (Frontend)
```bash
cd ../filosofi-yogya-mod
npm install @directus/sdk
```

### SDK Setup (lib/directus.ts)
```typescript
// lib/directus.ts
import { createDirectus, rest, readItems } from '@directus/sdk';

interface Collections {
  map_locations: MapLocation[];
  agenda_events: AgendaEvent[];
  // ... other collections
}

const directus = createDirectus<Collections>(
  process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055'
).with(rest());

export default directus;
```

### Fetch Data Pattern
```typescript
// app/api/heritage/route.ts
import directus from '@/lib/directus';
import { readItems } from '@directus/sdk';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale') || 'id';
  
  try {
    const locations = await directus.request(
      readItems('map_locations', {
        filter: {
          status: { _eq: 'published' }
        },
        fields: [
          'id',
          `title_${locale}`,
          `description_${locale}`,
          'latitude',
          'longitude',
          'images.*'
        ],
        sort: ['-date_created']
      })
    );
    
    // Transform response
    const transformed = locations.map(item => ({
      id: item.id,
      title: item[`title_${locale}`],
      description: item[`description_${locale}`],
      coordinates: {
        lat: item.latitude,
        lng: item.longitude
      },
      images: item.images
    }));
    
    return Response.json({
      success: true,
      data: transformed
    });
    
  } catch (error) {
    console.error('Directus fetch error:', error);
    return Response.json({
      success: false,
      error: 'Failed to fetch heritage locations'
    }, { status: 500 });
  }
}
```

---

## Development Best Practices

### 1. Environment Management
```bash
# Development
.env               # Local development

# Production (different values)
.env.production    # Production credentials
```

### 2. Version Control
```gitignore
# .gitignore (CRITICAL)
.env
.env.local
.env.*.local
uploads/
extensions/
database/
```

### 3. Database Backups
```bash
# Export schema
npx directus schema snapshot > schema.yaml

# Export data
npx directus database export > backup.sql

# Import schema
npx directus schema apply schema.yaml

# Import data
psql -U postgres -d filosofi_yogya_directus < backup.sql
```

### 4. Testing API Endpoints
```bash
# Use curl or Postman
curl http://localhost:8055/items/map_locations

# Or use Directus SDK
npx directus-extension-test
```

---

## Common Commands Reference

```bash
# Start Directus
npm start
npx directus start

# Bootstrap (first time setup)
npx directus bootstrap

# Schema management
npx directus schema snapshot         # Export schema
npx directus schema apply schema.yaml # Import schema

# Database
npx directus database migrate:latest  # Run migrations
npx directus database export          # Export data

# Users
npx directus users create --email admin@example.com --password password --role administrator

# Extensions
npx directus extensions create <name>

# Version
npx directus --version
```

---

## Troubleshooting

### Port Already in Use
```bash
# Change in .env
PORT=8056
PUBLIC_URL=http://localhost:8056
```

### Database Connection Error
```bash
# Check PostgreSQL is running
psql -U postgres -l

# Verify .env credentials
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=filosofi_yogya_directus
DB_USER=postgres
DB_PASSWORD=correct_password
```

### Node Version Error
```bash
# Use fnm to switch to Node 22
fnm use 22
node --version  # Should show v22.x.x
```

### Bootstrap Fails
```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE filosofi_yogya_directus;"
psql -U postgres -c "CREATE DATABASE filosofi_yogya_directus;"

# Re-run bootstrap
npx directus bootstrap
```

### Permission Denied Errors
```bash
# Ensure Git Bash is used (not CMD/PowerShell)
# Check file permissions
ls -la start.sh
chmod +x start.sh  # Make executable if needed
```

---

## CRITICAL RULES - CMS Development

### ❌ NEVER
1. Commit `.env` file to Git
2. Use weak admin passwords
3. Run Directus in CMD/PowerShell (use Git Bash!)
4. Deploy without changing default credentials
5. Expose admin panel to public without authentication
6. Store sensitive data in collection fields
7. Use same security keys across environments

### ✅ ALWAYS
1. Use Git Bash for all Directus operations
2. Generate unique security keys per environment
3. Set proper permissions on Public role
4. Filter `status = published` for public API
5. Use bilingual field pattern (field_id, field_en)
6. Backup database before major changes
7. Test API endpoints before frontend integration
8. Document collection schemas
9. Use Directus SDK in frontend (not raw fetch)
10. Keep Directus version updated

---

## Quick Checklist

Before considering CMS setup complete:
- [ ] PostgreSQL database created
- [ ] `.env` configured with unique keys
- [ ] Directus bootstrapped successfully
- [ ] Admin panel accessible at http://localhost:8055
- [ ] Collections created matching data model
- [ ] Bilingual fields configured (field_id, field_en)
- [ ] Public role permissions set correctly
- [ ] Mock data migrated (or ready to migrate)
- [ ] API endpoints tested with curl/Postman
- [ ] Frontend SDK integration tested
- [ ] Image upload and transformation working
- [ ] Backup script tested

---

## Integration with Frontend

### Environment Variables (Frontend .env)
```bash
NEXT_PUBLIC_DIRECTUS_URL=http://localhost:8055
```

### Type Definitions (Frontend)
```typescript
// types/Directus.types.ts
export interface DirectusMapLocation {
  id: string;
  title_id: string;
  title_en: string;
  description_id: string;
  description_en: string;
  latitude: number;
  longitude: number;
  category: string;
  images: DirectusFile[];
  date_created: string;
}

export interface DirectusFile {
  id: string;
  filename_disk: string;
  filename_download: string;
  title: string;
  type: string;
  width: number;
  height: number;
}
```

---

## Notes
- This skill is based on repository analysis of https://github.com/Z20ben/filosofi-yogya-directus
- Mock data structure inferred from frontend repository documentation
- Bilingual pattern designed for Indonesian (primary) + English
- Follow these patterns for consistency with frontend integration

**Last Updated:** Based on repository analysis January 2026
