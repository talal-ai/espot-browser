#!/bin/bash
# Quick Build Script for ESPOT Browser (Mac/Linux)
# Usage: ./build.sh [win|mac|linux|all]

PLATFORM=${1:-mac}

echo "🚀 ESPOT Browser - Build Script"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

# Navigate to frontend
cd frontend

# Check for .env file
echo "📋 Checking environment files..."
if [ ! -f ".env.production.local" ]; then
    echo "⚠️  Warning: .env.production.local not found"
    echo "   Creating from template..."
    
    if [ -f ".env.production" ]; then
        cp ".env.production" ".env.production.local"
        echo "   ✅ Created .env.production.local - PLEASE UPDATE WITH YOUR SECRETS!"
        echo "   Press any key to continue or Ctrl+C to exit and update secrets first..."
        read -n 1 -s
    else
        echo "❌ Error: No .env.production template found"
        exit 1
    fi
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Build based on platform
echo ""
echo "🔨 Building for: $PLATFORM"

case $PLATFORM in
    win)
        echo "   Building Windows installer + portable..."
        npm run dist:win
        ;;
    mac)
        echo "   Building macOS DMG + ZIP..."
        npm run dist:mac
        ;;
    linux)
        echo "   Building Linux AppImage + DEB..."
        npm run dist:linux
        ;;
    all)
        echo "   Building for all platforms..."
        npm run dist
        ;;
    *)
        echo "❌ Unknown platform: $PLATFORM"
        echo "   Valid options: win, mac, linux, all"
        exit 1
        ;;
esac

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build completed successfully!"
    echo ""
    echo "📂 Output location:"
    echo "   $(pwd)/release"
    echo ""
    echo "📦 Built files:"
    ls -lh release/*.{exe,dmg,AppImage,deb,zip} 2>/dev/null | awk '{print "   📄 " $9 " (" $5 ")"}'
    echo ""
    echo "🎉 Ready to distribute!"
else
    echo ""
    echo "❌ Build failed - check errors above"
    exit 1
fi

cd ..
