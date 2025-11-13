# BOKI Kiosk - Android Only Deployment Guide

## ✅ Current Status: Android Platform Ready!

Your kiosk app has been successfully configured for Android-only deployment. Here's what's been completed and what to do next:

### ✅ Completed Steps:
1. **Android Platform Added** - Android project created in `kiosk-app-capacitor/android/`
2. **Build System Configured** - Vite build working for kiosk mode
3. **Assets Synced** - Web assets copied to Android project
4. **Configuration Updated** - Capacitor config optimized for Android

### 🚀 Next Steps for Android Deployment

#### 1. Install Android Development Tools
If you haven't already, install:
- **Android Studio** (recommended) - Download from https://developer.android.com/studio
- **Android SDK** - Included with Android Studio
- **Java JDK 11** - Required for Android development

#### 2. Build Your APK

**Option A: Using Android Studio (Recommended)**
```bash
# Navigate to your Android project
cd kiosk-app-capacitor/android

# Open in Android Studio (if installed)
npx cap open android

# Or manually open Android Studio and import the android folder
```

**Option B: Command Line Build**
```bash
# Navigate to Android project
cd kiosk-app-capacitor/android

# Make gradlew executable (if needed)
chmod +x gradlew

# Build debug APK
./gradlew assembleDebug

# Build release APK (requires signing configuration)
./gradlew assembleRelease
```

#### 3. Configure for Kiosk Mode

**Android Kiosk Settings in `capacitor.config.ts`:**
```typescript
android: {
  webContentsDebuggingEnabled: true, // Set to false for production
  allowMixedContent: false,
  captureInput: true,
  useLegacyBridge: false,
}
```

#### 4. Production Settings

**Update for Production:**
```typescript
// In kiosk-app-capacitor/capacitor.config.ts
const config: CapacitorConfig = {
  appId: 'com.boki.kiosk',
  appName: 'BOKI Kiosk',
  webDir: 'dist-kiosk',
  server: {
    url: 'https://bokicapstone.vercel.app/kiosk', // Your production URL
    allowNavigation: ['bokicapstone.vercel.app'],
  },
  android: {
    webContentsDebuggingEnabled: false, // Disable for production
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};
```

#### 5. Build Commands for Android Only

```bash
# Build kiosk app
npm run build:kiosk

# Sync with Android
cd kiosk-app-capacitor && npx cap sync android

# Build APK (from android directory)
cd kiosk-app-capacitor/android && ./gradlew assembleDebug
```

### 📱 Android Kiosk Mode Setup

After installing your APK on Android devices:

1. **Enable Developer Options**: Settings > About > Tap Build Number 7 times
2. **Enable USB Debugging**: Settings > Developer Options > USB Debugging
3. **Set as Device Owner**: Use ADB commands or MDM solution
4. **Configure Kiosk Mode**: Use Android's Lock Task Mode

### 🔧 ADB Commands for Kiosk Mode

```bash
# Set app as device owner (requires ADB)
adb shell dpm set-device-owner com.boki.kiosk/.AdminReceiver

# Enable lock task mode
adb shell am set-lock-task-packages com.boki.kiosk

# Start in lock task mode
adb shell am start --lock-task com.boki.kiosk
```

### 📋 Testing Checklist

- [ ] APK builds successfully
- [ ] App installs on Android device
- [ ] Kiosk mode activates automatically
- [ ] App loads content from Netlify
- [ ] No navigation outside allowed domains
- [ ] Landscape orientation locked
- [ ] Splash screen displays correctly
- [ ] No status bar in full screen mode

### 🆘 Troubleshooting

**Build Issues:**
- Ensure Android SDK is properly installed
- Check Java JDK version (11 recommended)
- Verify ANDROID_HOME environment variable

**Kiosk Mode Issues:**
- Test on physical device (emulator may not support all features)
- Check device administrator permissions
- Verify app is set as device owner

**Deployment Issues:**
- Ensure HTTPS for production URL
- Check network connectivity on device
- Verify domain whitelisting in config

### 🎯 Final APK Location

After successful build, your APK will be located at:
```
kiosk-app-capacitor/android/app/build/outputs/apk/debug/app-debug.apk
```

For release builds:
```
kiosk-app-capacitor/android/app/build/outputs/apk/release/app-release.apk
```

---

**Your Android kiosk app is ready for deployment! 🚀**

The app will automatically load your BOKI application in kiosk mode, perfect for restaurant ordering tablets.