@echo off
REM Setup LibreTranslate via Docker
REM Run this after Docker Desktop is started

echo.
echo 🚀 Setting up LibreTranslate...
echo.

REM Check if Docker is running
docker ps >nul 2>&1
if errorlevel 1 (
  echo ❌ Docker is not running!
  echo    Please start Docker Desktop first
  pause
  exit /b 1
)

echo ✅ Docker is running
echo.

REM Check if libretranslate container already exists
docker ps -a | findstr libretranslate >nul 2>&1
if not errorlevel 1 (
  echo ⚠️  LibreTranslate container already exists
  echo    Removing old container...
  docker rm -f libretranslate
)

echo 📥 Pulling LibreTranslate image...
docker pull libretranslate/libretranslate:latest

echo.
echo 🏃 Starting LibreTranslate container...
docker run -d --name libretranslate -p 5000:5000 -e LT_LOAD_ONLY=id,en -e LT_THREADS=4 --restart unless-stopped libretranslate/libretranslate:latest

echo.
echo ⏳ Waiting for LibreTranslate to be ready (30 seconds)...
timeout /t 30 /nobreak >nul

echo.
echo 🧪 Testing LibreTranslate...
curl -s http://localhost:5000/translate -H "Content-Type: application/json" -d "{\"q\":\"Selamat datang di Yogyakarta\",\"source\":\"id\",\"target\":\"en\"}"

echo.
echo.
echo ✅ LibreTranslate is ready!
echo.
echo 📊 Container info:
docker ps | findstr libretranslate

echo.
echo 📋 Usage:
echo    Translate API: http://localhost:5000/translate
echo    Languages: http://localhost:5000/languages
echo    View logs: docker logs libretranslate
echo    Stop: docker stop libretranslate
echo    Start: docker start libretranslate
echo.
pause
