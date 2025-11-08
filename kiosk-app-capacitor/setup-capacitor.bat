@echo off
REM BOKI Kiosk Capacitor Setup Script for Windows
REM This script sets up the Capacitor mobile app for the BOKI kiosk system

echo 🏪 Setting up BOKI Kiosk Capacitor App...

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is required. Please install it first.
    exit /b 1
)

REM Initialize Capacitor project
echo 📱 Initializing Capacitor project...
call npx cap init "BOKI Kiosk" "com.boki.kiosk" --web-dir="dist-kiosk"

REM Ask user which platforms to add
echo 📱 Which platforms would you like to add?
echo 1) Android
echo 2) iOS
echo 3) Bothecho 4) Skip for now

set /p platform_choice="Enter your choice (1-4): "

if "%platform_choice%"=="1" (
    echo 🤖 Adding Android platform...
    call npx cap add android
) else if "%platform_choice%"=="2" (
    echo 🍎 Adding iOS platform...
    call npx cap add ios
) else if "%platform_choice%"=="3" (
    echo 🤖 Adding Android platform...
    call npx cap add android
    echo 🍎 Adding iOS platform...
    call npx cap add ios
) else if "%platform_choice%"=="4" (
    echo ⏭️ Skipping platform addition. You can add them later with:
    echo    npx cap add android
    echo    npx cap add ios
) else (
    echo ❌ Invalid choice. Skipping platform addition.
)

REM Build the kiosk version
echo 🔨 Building kiosk version...
call npm run build:kiosk

REM Sync Capacitor
echo 🔄 Syncing Capacitor...
call npx cap sync

echo ✅ BOKI Kiosk Capacitor setup complete!
echo.
echo 📋 Next steps:
echo 1. Open the platform project in your IDE:
echo    - Android: Open android\ folder in Android Studio
echo    - iOS: Open ios\ folder in Xcode
echo.
echo 2. Configure app signing and deployment settings
echo.
echo 3. Test the app:
echo    - Android: npx cap run android
echo    - iOS: npx cap run ios
echo.
echo 4. Build for production:
echo    - Android: npm run cap:build:android
echo    - iOS: npm run cap:build:ios

pause