#!/bin/bash

# Filosofi Yogya - Directus Start Script
# Usage: ./start.sh

echo "======================================"
echo "  Filosofi Yogya - Directus Backend"
echo "======================================"
echo ""

# Load fnm environment
eval "$(fnm env)"

# Switch to Node 22
echo "🔧 Switching to Node.js 22..."
fnm use 22

# Check Node version
NODE_VERSION=$(node --version)
echo "✅ Using Node.js $NODE_VERSION"
echo ""

# Check if PostgreSQL is running (Windows compatible)
echo "🔍 Checking PostgreSQL..."
if command -v netstat.exe &> /dev/null; then
    if netstat.exe -an 2>/dev/null | grep -q ":5432"; then
        echo "✅ PostgreSQL is running on port 5432"
    else
        echo "⚠️  Warning: Cannot detect PostgreSQL on port 5432"
        echo "   If Directus fails to start, check PostgreSQL is running"
    fi
elif command -v ss &> /dev/null; then
    if ss -tuln 2>/dev/null | grep -q ":5432"; then
        echo "✅ PostgreSQL is running on port 5432"
    fi
else
    echo "ℹ️  Skipping PostgreSQL check"
fi
echo ""

# Start Directus
echo "🚀 Starting Directus..."
echo "   Admin Panel: http://localhost:8055"
echo ""
echo "Press Ctrl+C to stop the server"
echo "======================================"
echo ""

npm start
