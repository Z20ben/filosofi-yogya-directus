#!/bin/bash
# Setup LibreTranslate via Docker
# Run this after Docker Desktop is started

echo "🚀 Setting up LibreTranslate..."
echo ""

# Check if Docker is running
if ! docker ps >/dev/null 2>&1; then
  echo "❌ Docker is not running!"
  echo "   Please start Docker Desktop first"
  exit 1
fi

echo "✅ Docker is running"
echo ""

# Check if libretranslate container already exists
if docker ps -a | grep -q libretranslate; then
  echo "⚠️  LibreTranslate container already exists"
  echo "   Removing old container..."
  docker rm -f libretranslate
fi

echo "📥 Pulling LibreTranslate image..."
docker pull libretranslate/libretranslate:latest

echo ""
echo "🏃 Starting LibreTranslate container..."
docker run -d \
  --name libretranslate \
  -p 5000:5000 \
  -e LT_LOAD_ONLY=id,en \
  -e LT_THREADS=4 \
  --restart unless-stopped \
  libretranslate/libretranslate:latest

echo ""
echo "⏳ Waiting for LibreTranslate to be ready (30 seconds)..."
sleep 30

echo ""
echo "🧪 Testing LibreTranslate..."
curl -s http://localhost:5000/translate \
  -H "Content-Type: application/json" \
  -d '{"q":"Selamat datang di Yogyakarta","source":"id","target":"en"}' \
  | python -m json.tool

echo ""
echo "✅ LibreTranslate is ready!"
echo ""
echo "📊 Container info:"
docker ps | grep libretranslate

echo ""
echo "📋 Usage:"
echo "   Translate API: http://localhost:5000/translate"
echo "   Languages: http://localhost:5000/languages"
echo "   View logs: docker logs libretranslate"
echo "   Stop: docker stop libretranslate"
echo "   Start: docker start libretranslate"
