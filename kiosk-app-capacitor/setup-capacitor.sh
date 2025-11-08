#!/bin/bash

# BOKI Kiosk Capacitor Setup Script
# This script sets up the Capacitor mobile app for the BOKI kiosk system

echo "🏪 Setting up BOKI Kiosk Capacitor App..."

# Check if Capacitor CLI is installed
if ! command -v npx &> /dev/null; then
    echo "❌ Node.js and npm are required. Please install them first."
    exit 1
fi

# Initialize Capacitor project
echo "📱 Initializing Capacitor project..."
npx cap init "BOKI Kiosk" "com.boki.kiosk" --web-dir="dist-kiosk"

# Add platforms (ask user which ones to add)
echo "📱 Which platforms would you like to add?"
echo "1) Android"
echo "2) iOS"
echo "3) Both"
echo "4) Skip for now"

read -p "Enter your choice (1-4): " platform_choice

case $platform_choice in
    1)
        echo "🤖 Adding Android platform..."
        npx cap add android
        ;;
    2)
        echo "🍎 Adding iOS platform..."
        npx cap add ios
        ;;
    3)
        echo "🤖 Adding Android platform..."
        npx cap add android
        echo "🍎 Adding iOS platform..."
        npx cap add ios
        ;;
    4)
        echo "⏭️ Skipping platform addition. You can add them later with:"
        echo "   npx cap add android"
        echo "   npx cap add ios"
        ;;
    *)
        echo "❌ Invalid choice. Skipping platform addition."
        ;;
esac

# Build the kiosk version
echo "🔨 Building kiosk version..."
npm run build:kiosk

# Sync Capacitor
echo "🔄 Syncing Capacitor..."
npx cap sync

echo "✅ BOKI Kiosk Capacitor setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Open the platform project in your IDE:"
echo "   - Android: Open android/ folder in Android Studio"
echo "   - iOS: Open ios/ folder in Xcode"
echo ""
echo "2. Configure app signing and deployment settings"
echo ""
echo "3. Test the app:"
echo "   - Android: npx cap run android"
echo "   - iOS: npx cap run ios"
echo ""
echo "4. Build for production:"
echo "   - Android: npm run cap:build:android"
echo "   - iOS: npm run cap:build:ios"