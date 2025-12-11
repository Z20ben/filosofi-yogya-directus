import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Parse both JSON and text (Directus sometimes sends text/plain)
app.use(express.json());
app.use(express.text({ type: 'text/plain' }));

// Debug middleware - log raw request
app.use('/webhook/auto-translate', (req, res, next) => {
  console.log('\n📨 Raw request received:');
  console.log('   Content-Type:', req.headers['content-type']);
  console.log('   X-Webhook-Secret:', req.headers['x-webhook-secret'] ? '***' : '(not set)');
  next();
});

// Force use 127.0.0.1 for internal communication (avoid IPv6 ::1 issues)
const DIRECTUS_URL = 'http://127.0.0.1:8055';
const LIBRETRANSLATE_URL = 'http://127.0.0.1:5000';
const PORT = 8001;

// Admin token for Directus API
let accessToken = null;

// Login to Directus
async function login() {
  try {
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
    console.log('✅ Authenticated to Directus');
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
  }
}

// Translate text using LibreTranslate
async function translateText(text) {
  if (!text || text.trim() === '') return '';

  try {
    const response = await fetch(`${LIBRETRANSLATE_URL}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: 'id',
        target: 'en',
      }),
    });

    if (!response.ok) throw new Error('Translation failed');
    const data = await response.json();
    return data.translatedText;
  } catch (error) {
    console.error(`   ⚠️  Translation error: ${error.message}`);
    return text; // Return original if translation fails
  }
}

// Collection field mapping
const TRANSLATABLE_FIELDS = {
  'map_locations': ['name', 'description', 'address', 'opening_hours', 'ticket_price'],
  'destinasi_wisata': ['name', 'location', 'description', 'hours'],
  'agenda_events': ['title', 'description', 'location', 'organizer'],
  'umkm_lokal': ['name', 'description', 'address', 'category'],
  'spot_nongkrong': ['name', 'description', 'address'],
  'trending_articles': ['title', 'excerpt', 'content', 'author'],
  'encyclopedia_entries': ['title', 'content', 'summary'],
};

// Check if translation already exists
async function checkTranslationExists(collection, itemId) {
  try {
    const response = await fetch(
      `${DIRECTUS_URL}/items/${collection}_translations?filter[${collection}_id][_eq]=${itemId}&filter[languages_code][_eq]=en-US`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) return null;
    const data = await response.json();
    return data.data && data.data.length > 0 ? data.data[0] : null;
  } catch (error) {
    console.error('   ⚠️  Error checking existing translation:', error.message);
    return null;
  }
}

// Create or update translation
async function saveTranslation(collection, itemId, translations, existingId = null) {
  const translationData = {
    [`${collection}_id`]: itemId,
    languages_code: 'en-US',
    ...translations,
  };

  try {
    if (existingId) {
      // Update existing translation
      const response = await fetch(`${DIRECTUS_URL}/items/${collection}_translations/${existingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(translations),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(JSON.stringify(error));
      }

      return await response.json();
    } else {
      // Create new translation
      const response = await fetch(`${DIRECTUS_URL}/items/${collection}_translations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(translationData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(JSON.stringify(error));
      }

      return await response.json();
    }
  } catch (error) {
    console.error('   ❌ Error saving translation:', error.message);
    throw error;
  }
}

// Security: Secret token for webhook authentication
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'change-this-secret-token-in-production';

// Main webhook handler
app.post('/webhook/auto-translate', async (req, res) => {
  // Verify secret token
  const authHeader = req.headers['x-webhook-secret'];
  console.log('   Expected secret:', WEBHOOK_SECRET.substring(0, 10) + '...');
  console.log('   Received secret:', authHeader ? authHeader.substring(0, 10) + '...' : '(none)');

  if (authHeader !== WEBHOOK_SECRET) {
    console.log('   ❌ Unauthorized: Invalid webhook secret');
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  // Handle different body formats from Directus Flow
  let body = req.body;

  // If body is string (text/plain), try to parse it
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      // Try to fix double-encoded JSON
      try {
        body = JSON.parse(JSON.parse(body));
      } catch (e2) {
        console.log('   ❌ Could not parse body:', body.substring(0, 100));
        return res.status(400).json({ success: false, error: 'Invalid JSON body' });
      }
    }
  }

  console.log('   Body keys:', Object.keys(body));

  // Directus Flow sends data in different formats
  // Option 1: Direct { collection, key, payload, event }
  // Option 2: $trigger object from Flow
  let collection, key, payload, event;

  if (body.$trigger) {
    // Flow sends $trigger object
    collection = body.$trigger.collection;
    key = body.$trigger.key || body.$trigger.keys?.[0];
    payload = body.$trigger.payload;
    event = body.$trigger.event;
  } else if (body.collection) {
    // Direct format
    collection = body.collection;
    key = body.key || body.keys?.[0];
    payload = body.payload;
    event = body.event;
  } else {
    console.log('   ❌ Unknown body format:', JSON.stringify(body).substring(0, 200));
    return res.status(400).json({ success: false, error: 'Unknown body format' });
  }

  console.log(`\n📥 Webhook received: ${event}`);
  console.log(`   Collection: ${collection}`);
  console.log(`   Item ID: ${key}`);

  // Check if collection has translatable fields
  const fields = TRANSLATABLE_FIELDS[collection];
  if (!fields) {
    console.log('   ⏭️  Skipping: no translatable fields defined');
    return res.status(200).json({ message: 'No translatable fields' });
  }

  try {
    // Re-authenticate if token expired
    if (!accessToken) {
      await login();
    }

    console.log('   🔄 Translating fields:', fields.join(', '));

    // Translate each field
    const translations = {};
    for (const field of fields) {
      const originalText = payload[field];
      if (originalText) {
        console.log(`      ${field}: "${originalText.substring(0, 50)}..."`);
        const translatedText = await translateText(originalText);
        translations[field] = translatedText;
        console.log(`      → "${translatedText.substring(0, 50)}..."`);
      }
    }

    // Check if translation already exists
    const existing = await checkTranslationExists(collection, key);

    if (existing) {
      console.log(`   📝 Updating existing translation (ID: ${existing.id})`);
      await saveTranslation(collection, key, translations, existing.id);
      console.log('   ✅ Translation updated!');
    } else {
      console.log('   📝 Creating new translation');
      await saveTranslation(collection, key, translations);
      console.log('   ✅ Translation created!');
    }

    res.status(200).json({
      success: true,
      message: 'Translation completed',
      translations
    });

  } catch (error) {
    console.error('   ❌ Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    libretranslate: LIBRETRANSLATE_URL,
    directus: DIRECTUS_URL
  });
});

// Start server
app.listen(PORT, 'localhost', async () => {
  console.log('🚀 Auto-Translate Webhook Server Started!\n');
  console.log(`   Listening on: http://localhost:${PORT}`);
  console.log(`   Webhook URL: http://localhost:${PORT}/webhook/auto-translate`);
  console.log(`   Health check: http://localhost:${PORT}/health\n`);
  console.log(`   LibreTranslate: ${LIBRETRANSLATE_URL}`);
  console.log(`   Directus: ${DIRECTUS_URL}\n`);

  // Login on startup
  await login();

  console.log('✅ Ready to receive webhooks!\n');
  console.log('📋 Next steps:');
  console.log('   1. Go to Directus: Settings → Webhooks');
  console.log('   2. Create webhook with URL: http://localhost:3000/webhook/auto-translate');
  console.log('   3. Test by creating new content in Indonesian\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down webhook server...');
  process.exit(0);
});
