# Filosofi Yogya - Full-Stack Integration Skill

## Project Context
**Frontend:** filosofi-yogya-mod (Next.js)  
**Backend:** filosofi-yogya-directus (Directus CMS)  
**Purpose:** Complete integration guidelines for headless CMS architecture

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  User Browser                                               │
│  └─ Next.js Frontend (filosofi-yogya-mod)                 │
│     ├─ Static Pages (SSG)                                  │
│     ├─ Dynamic Pages (SSR/ISR)                             │
│     └─ Client Components (Interactive)                     │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTP/HTTPS
                 ↓
┌─────────────────────────────────────────────────────────────┐
│  Next.js API Routes (/app/api/*)                           │
│  ├─ Data Transformation Layer                              │
│  ├─ Caching Layer (optional)                               │
│  └─ Error Handling                                         │
└────────────────┬────────────────────────────────────────────┘
                 │ Directus SDK / REST API
                 ↓
┌─────────────────────────────────────────────────────────────┐
│  Directus CMS (filosofi-yogya-directus)                   │
│  ├─ REST API (http://localhost:8055/items/*)              │
│  ├─ GraphQL API (optional)                                 │
│  ├─ Asset Transformation (/assets/*)                       │
│  └─ Permissions & Roles                                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│  PostgreSQL Database                                        │
│  └─ Collections (map_locations, agenda_events, etc.)       │
└─────────────────────────────────────────────────────────────┘
```

---

## Integration Strategy

### Why API Routes as Middleware?

**Don't expose Directus directly to frontend!**

```
❌ BAD: Frontend → Directus directly
- Exposes CMS structure
- No caching control
- Harder to migrate CMS later
- Security concerns
- No data transformation

✅ GOOD: Frontend → Next.js API → Directus
- Abstraction layer
- Can add caching
- Transform data to match frontend needs
- Hide CMS implementation details
- Easy to switch CMS later
- Better error handling
```

---

## Project Setup

### 1. Directus SDK Installation

```bash
cd filosofi-yogya-mod
npm install @directus/sdk
```

### 2. Environment Variables

**Frontend (.env.local):**
```bash
# Directus CMS
DIRECTUS_URL=http://localhost:8055
NEXT_PUBLIC_DIRECTUS_URL=http://localhost:8055  # For client-side if needed

# Optional: Static token for server-side requests
DIRECTUS_TOKEN=your_admin_token_here  # Only if auth needed
```

**Backend/CMS (.env):**
```bash
# Already configured in CMS skill
PORT=8055
PUBLIC_URL=http://localhost:8055
CORS_ENABLED=true
CORS_ORIGIN=http://localhost:3000  # Frontend URL
```

---

## Directus Client Setup

### Shared Directus Instance (lib/directus.ts)

```typescript
// lib/directus.ts
import { createDirectus, rest, readItems, readItem } from '@directus/sdk';

// Define your collections schema
interface DirectusSchema {
  map_locations: MapLocationItem[];
  agenda_events: AgendaEventItem[];
  destinasi_wisata: DestinasiWisataItem[];
  spot_nongkrong: SpotNongkrongItem[];
  trending_articles: TrendingArticleItem[];
  encyclopedia: EncyclopediaItem[];
  encyclopedia_categories: EncyclopediaCategoryItem[];
  umkm_lokal: UMKMLokalItem[];
}

// Raw Directus types (as stored in database with Translations)
interface MapLocationItem {
  id: string;
  status: 'published' | 'draft';
  
  // Base fields (fallback/default)
  title: string;
  description: string;
  
  // Translations (Directus managed)
  translations: MapLocationTranslation[];
  
  // Non-translatable fields
  latitude: number;
  longitude: number;
  address: string;
  category: string;
  images: DirectusFile[];
  
  // System fields
  date_created: string;
  date_updated: string;
}

// Translation interface
interface MapLocationTranslation {
  id: number;
  map_locations_id: string;
  languages_code: 'id-ID' | 'en-US';
  title: string;
  description: string;
  historical_significance: string;
}

interface DirectusFile {
  id: string;
  filename_disk: string;
  filename_download: string;
  title: string;
  type: string;
  width: number;
  height: number;
}

// Create Directus instance
const directus = createDirectus<DirectusSchema>(
  process.env.DIRECTUS_URL || 'http://localhost:8055'
).with(rest());

export default directus;

// Export SDK functions for convenience
export { readItems, readItem };
```

---

## API Route Patterns

### Pattern 1: Get All Items (with Directus Translations)

```typescript
// app/api/heritage/route.ts
import { NextRequest } from 'next/server';
import directus, { readItems } from '@/lib/directus';
import type { HeritageLocation } from '@/types/Heritage.types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'id-ID'; // 'id-ID' or 'en-US'
  
  try {
    // Fetch from Directus with Translations
    const items = await directus.request(
      readItems('map_locations', {
        filter: {
          status: { _eq: 'published' }
        },
        fields: [
          'id',
          'title',  // Base field (fallback)
          'latitude',
          'longitude',
          'address',
          'category',
          'translations.*',  // Get all translation fields
          'images.id',
          'images.filename_disk',
          'images.title',
          'images.width',
          'images.height'
        ],
        // Filter translations to specific language
        deep: {
          translations: {
            _filter: {
              languages_code: { _eq: locale }
            }
          }
        },
        sort: ['-date_created'],
        limit: -1
      })
    );
    
    // Transform to frontend-friendly format
    const transformed: HeritageLocation[] = items.map(item => {
      // Get translation for requested locale
      const translation = item.translations?.find(
        t => t.languages_code === locale
      );
      
      return {
        id: item.id,
        // Use translated value, fallback to base field
        title: translation?.title || item.title,
        description: translation?.description || item.description,
        coordinates: {
          lat: item.latitude,
          lng: item.longitude
        },
        address: item.address,
        category: item.category,
        historicalSignificance: translation?.historical_significance || '',
        images: item.images?.map(img => ({
          id: img.id,
          url: `${process.env.DIRECTUS_URL}/assets/${img.id}`,
          thumbnail: `${process.env.DIRECTUS_URL}/assets/${img.id}?width=400&height=300&fit=cover`,
          title: img.title,
          width: img.width,
          height: img.height
        })) || []
      };
    });
    
    return Response.json({
      success: true,
      data: transformed
    });
    
  } catch (error) {
    console.error('Failed to fetch heritage locations:', error);
    return Response.json({
      success: false,
      error: 'Failed to fetch heritage locations'
    }, { status: 500 });
  }
}
```

### Pattern 2: Get Single Item by ID

```typescript
// app/api/heritage/[id]/route.ts
import { NextRequest } from 'next/server';
import directus, { readItem } from '@/lib/directus';

interface RouteParams {
  params: { id: string }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const locale = request.nextUrl.searchParams.get('locale') || 'id';
  
  try {
    const item = await directus.request(
      readItem('map_locations', params.id, {
        fields: [
          'id',
          `title_${locale}`,
          `description_${locale}`,
          'latitude',
          'longitude',
          'address',
          'category',
          `historical_significance_${locale}`,
          'images.*'
        ]
      })
    );
    
    // Transform
    const transformed = {
      id: item.id,
      title: item[`title_${locale}`],
      description: item[`description_${locale}`],
      coordinates: {
        lat: item.latitude,
        lng: item.longitude
      },
      address: item.address,
      category: item.category,
      historicalSignificance: item[`historical_significance_${locale}`],
      images: item.images?.map(img => ({
        url: `${process.env.DIRECTUS_URL}/assets/${img.id}`,
        thumbnail: `${process.env.DIRECTUS_URL}/assets/${img.id}?key=thumbnail`,
        title: img.title
      })) || []
    };
    
    return Response.json({
      success: true,
      data: transformed
    });
    
  } catch (error) {
    console.error(`Failed to fetch heritage location ${params.id}:`, error);
    return Response.json({
      success: false,
      error: 'Heritage location not found'
    }, { status: 404 });
  }
}
```

### Pattern 3: Search & Filter (with Translations)

```typescript
// app/api/heritage/search/route.ts
import { NextRequest } from 'next/server';
import directus, { readItems } from '@/lib/directus';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'id-ID';
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category');
  
  try {
    const filters: any = {
      status: { _eq: 'published' }
    };
    
    // Add category filter
    if (category) {
      filters.category = { _eq: category };
    }
    
    const items = await directus.request(
      readItems('map_locations', {
        filter: filters,
        fields: [
          'id',
          'title',
          'latitude',
          'longitude',
          'category',
          'translations.*'
        ],
        deep: {
          translations: {
            _filter: {
              languages_code: { _eq: locale },
              // Search in translated fields
              ...(query && {
                _or: [
                  { title: { _contains: query } },
                  { description: { _contains: query } }
                ]
              })
            }
          }
        },
        limit: 20
      })
    );
    
    // Transform with translation fallback
    const transformed = items.map(item => {
      const translation = item.translations?.find(
        t => t.languages_code === locale
      );
      
      return {
        id: item.id,
        title: translation?.title || item.title,
        description: translation?.description || item.description,
        coordinates: {
          lat: item.latitude,
          lng: item.longitude
        },
        category: item.category
      };
    });
    
    return Response.json({
      success: true,
      data: transformed,
      count: transformed.length
    });
    
  } catch (error) {
    console.error('Search failed:', error);
    return Response.json({
      success: false,
      error: 'Search failed'
    }, { status: 500 });
  }
}
```

### Pattern 4: Pagination

```typescript
// app/api/articles/route.ts
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'id';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  
  try {
    const items = await directus.request(
      readItems('trending_articles', {
        filter: {
          status: { _eq: 'published' }
        },
        fields: [
          'id',
          `title_${locale}`,
          `content_${locale}`,
          'slug',
          'featured_image.*',
          'date_published'
        ],
        limit: limit,
        offset: (page - 1) * limit,
        sort: ['-date_published']
      })
    );
    
    // Get total count for pagination
    const totalCount = await directus.request(
      readItems('trending_articles', {
        filter: { status: { _eq: 'published' } },
        aggregate: { count: '*' }
      })
    );
    
    return Response.json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
    
  } catch (error) {
    console.error('Failed to fetch articles:', error);
    return Response.json({
      success: false,
      error: 'Failed to fetch articles'
    }, { status: 500 });
  }
}
```

---

## Frontend Data Fetching

### Server Components (SSR/SSG)

```typescript
// app/[locale]/heritage/page.tsx
import type { HeritageLocation } from '@/types/Heritage.types';

async function getHeritageLocations(locale: string): Promise<HeritageLocation[]> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/heritage?locale=${locale}`,
      {
        next: { revalidate: 3600 }  // ISR: revalidate every hour
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch');
    }
    
    const result = await response.json();
    return result.success ? result.data : [];
    
  } catch (error) {
    console.error('Error fetching heritage locations:', error);
    return [];
  }
}

export default async function HeritagePage({
  params
}: {
  params: { locale: string }
}) {
  const locations = await getHeritageLocations(params.locale);
  
  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        Heritage Locations
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations.map(location => (
          <HeritageCard key={location.id} location={location} />
        ))}
      </div>
    </div>
  );
}
```

### Client Components (Interactive)

```typescript
// components/HeritageSearch.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

export default function HeritageSearch() {
  const t = useTranslations('Heritage');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    
    const debounce = setTimeout(() => {
      searchHeritage(query);
    }, 500);
    
    return () => clearTimeout(debounce);
  }, [query]);
  
  const searchHeritage = async (searchQuery: string) => {
    setLoading(true);
    
    try {
      const response = await fetch(
        `/api/heritage/search?q=${encodeURIComponent(searchQuery)}&locale=${locale}`
      );
      
      const result = await response.json();
      
      if (result.success) {
        setResults(result.data);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('searchPlaceholder')}
        className="w-full px-4 py-2 border rounded-lg"
      />
      
      {loading && <p>{t('searching')}</p>}
      
      <div className="mt-4">
        {results.map(item => (
          <SearchResultItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
```

---

## Caching Strategy

### Next.js Cache Levels

```typescript
// 1. Static Generation (Build Time)
export const revalidate = false;  // Never revalidate

// 2. Incremental Static Regeneration (ISR)
export const revalidate = 3600;  // Revalidate every hour

// 3. On-demand Revalidation (when content updates)
// In API route or webhook:
import { revalidatePath } from 'next/cache';
revalidatePath('/heritage');

// 4. Client-side caching with SWR/React Query
import useSWR from 'swr';

function useHeritage(locale: string) {
  const { data, error, isLoading } = useSWR(
    `/api/heritage?locale=${locale}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000  // 1 minute
    }
  );
  
  return { data, error, isLoading };
}
```

### Cache Invalidation via Webhook

**Directus → Next.js Webhook for cache invalidation**

```typescript
// app/api/webhooks/directus/route.ts
import { NextRequest } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    const webhook = await request.json();
    
    // Verify webhook secret
    const secret = request.headers.get('x-webhook-secret');
    if (secret !== process.env.DIRECTUS_WEBHOOK_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Invalidate cache based on collection
    const { collection, event } = webhook;
    
    switch (collection) {
      case 'map_locations':
        revalidatePath('/heritage');
        revalidatePath('/[locale]/heritage', 'page');
        break;
        
      case 'trending_articles':
        revalidatePath('/articles');
        revalidatePath('/[locale]/articles', 'page');
        break;
        
      // Add other collections...
    }
    
    return Response.json({ 
      success: true,
      revalidated: collection
    });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
```

**Setup in Directus:**
1. Go to Settings → Webhooks
2. Create new webhook
3. URL: `https://your-domain.com/api/webhooks/directus`
4. Method: POST
5. Triggers: item.create, item.update, item.delete
6. Collections: Select relevant collections
7. Headers: `x-webhook-secret: your_secret_here`

---

## Image Handling Integration

### Pattern: Directus Assets + Next.js Image

```typescript
// components/DirectusImage.tsx
import Image from 'next/image';

interface DirectusImageProps {
  fileId: string;
  alt: string;
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'inside' | 'outside';
  quality?: number;
}

export default function DirectusImage({
  fileId,
  alt,
  width = 800,
  height = 600,
  fit = 'cover',
  quality = 80
}: DirectusImageProps) {
  const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL;
  
  // Directus transformation URL
  const imageUrl = `${directusUrl}/assets/${fileId}?width=${width}&height=${height}&fit=${fit}&quality=${quality}`;
  
  return (
    <Image
      src={imageUrl}
      alt={alt}
      width={width}
      height={height}
      className="rounded-lg"
    />
  );
}
```

### Usage:
```typescript
// In component
<DirectusImage
  fileId={location.images[0].id}
  alt={location.title}
  width={800}
  height={600}
  fit="cover"
/>
```

---

## Error Handling Strategy

### Unified Error Response

```typescript
// lib/apiResponse.ts
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export function successResponse<T>(data: T): APIResponse<T> {
  return {
    success: true,
    data
  };
}

export function errorResponse(
  error: string,
  code?: string
): APIResponse<never> {
  return {
    success: false,
    error,
    code
  };
}
```

### Error Handling in API Routes

```typescript
// app/api/heritage/route.ts
import { successResponse, errorResponse } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const data = await fetchFromDirectus();
    return Response.json(successResponse(data));
    
  } catch (error) {
    if (error instanceof DirectusError) {
      return Response.json(
        errorResponse('CMS error', 'DIRECTUS_ERROR'),
        { status: 500 }
      );
    }
    
    if (error instanceof ValidationError) {
      return Response.json(
        errorResponse('Invalid request', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }
    
    return Response.json(
      errorResponse('Internal server error'),
      { status: 500 }
    );
  }
}
```

---

## Type Safety Across Stack

### Shared Types Pattern

```typescript
// types/Heritage.types.ts

// Frontend-facing types (transformed)
export interface HeritageLocation {
  id: string;
  title: string;
  description: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  address: string;
  category: HeritageCategory;
  historicalSignificance: string;
  images: HeritageImage[];
}

export interface HeritageImage {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
  width: number;
  height: number;
}

export type HeritageCategory = 'monument' | 'palace' | 'temple' | 'market';

// Directus raw types (as stored in CMS)
export interface DirectusMapLocation {
  id: string;
  status: 'published' | 'draft';
  title_id: string;
  title_en: string;
  description_id: string;
  description_en: string;
  latitude: number;
  longitude: number;
  address: string;
  category: string;
  images: DirectusFile[];
  historical_significance_id: string;
  historical_significance_en: string;
  date_created: string;
  date_updated: string;
}
```

---

## Development Workflow

### Local Development Setup

```bash
# Terminal 1: Start CMS
cd filosofi-yogya-directus
./start.sh

# Terminal 2: Start Frontend
cd filosofi-yogya-mod
npm run dev

# Access points:
# - CMS Admin: http://localhost:8055
# - Frontend: http://localhost:3000
# - API: http://localhost:3000/api/*
```

### Testing Integration

```bash
# Test API endpoint
curl http://localhost:3000/api/heritage?locale=id

# Test Directus directly (for debugging)
curl http://localhost:8055/items/map_locations?filter[status][_eq]=published
```

---

## CRITICAL INTEGRATION RULES

### ❌ NEVER
1. Expose Directus URL directly to frontend
2. Fetch from Directus in client components
3. Hardcode Directus URL in code
4. Skip data transformation layer
5. Return raw Directus responses to frontend
6. Use same types for CMS and frontend
7. Commit .env files with API tokens

### ✅ ALWAYS
1. Use API routes as middleware
2. Transform Directus data to frontend format
3. Use environment variables for URLs
4. Handle errors gracefully
5. Implement caching strategy
6. Type both Directus and frontend data
7. Test integration endpoints
8. Use locale parameter for bilingual content
9. Optimize image URLs with Directus transforms
10. Invalidate cache when content updates

---

## Quick Reference

### Fetch Pattern
```typescript
// Server Component
const data = await fetch('/api/heritage', { next: { revalidate: 3600 } });

// Client Component
const { data } = useSWR('/api/heritage', fetcher);
```

### Image Pattern
```typescript
const imageUrl = `${DIRECTUS_URL}/assets/${fileId}?width=800&height=600&fit=cover`;
```

### Locale Pattern
```typescript
const field = `title_${locale}`;  // title_id or title_en
```

### API Response Pattern
```typescript
return Response.json({
  success: true,
  data: transformedData
});
```

---

## Notes
- This skill integrates filosofi-yogya-mod frontend with filosofi-yogya-directus backend
- Follows headless CMS best practices
- Maintains separation of concerns
- Enables easy CMS migration if needed
- Optimized for Next.js App Router patterns

**Last Updated:** Based on repository analysis January 2026
