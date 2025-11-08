# Build APK in Android Studio - Step by Step Guide

## 🎯 Current Status: Ready to Build!

Your web assets are built and synced. Now let's build the APK in Android Studio.

## 📱 Step-by-Step APK Build Process

### Step 1: Sync Project in Android Studio

1. **In Android Studio**, you should see the Android project loaded
2. **Click "Sync Now"** if you see a yellow bar at the top
3. **Or go to**: File → Sync Project with Gradle Files
4. **Wait for sync to complete** (progress bar at bottom)

### Step 2: Build the APK

**Option A: Using Build Menu (Recommended)**
1. **Click**: Build → Build Bundle(s) / APK(s) → Build APK(s)
2. **Wait for build to complete** (usually 2-5 minutes)
3. **Look for**: "Build APK(s)" completed notification

**Option B: Using Gradle Panel**
1. **Open**: Gradle panel (right side of Android Studio)
2. **Navigate to**: `:app → Tasks → build`
3. **Double-click**: `assembleDebug` (for debug APK)
4. **Or double-click**: `assembleRelease` (for release APK)

### Step 3: Locate Your APK

**After successful build, find your APK at:**
```
kiosk-app-capacitor/android/app/build/outputs/apk/debug/app-debug.apk
```

**For release builds:**
```
kiosk-app-capacitor/android/app/build/outputs/apk/release/app-release.apk
```

### Step 4: Install and Test

**Install via ADB (if device connected):**
```bash
adb install kiosk-app-capacitor/android/app/build/outputs/apk/debug/app-debug.apk
```

**Or manually:**
1. **Copy APK to device** (via USB, email, or cloud)
2. **Enable Unknown Sources**: Settings → Security → Unknown Sources
3. **Install the APK**

## 🔧 Important Configuration Checks

### Before Building, Verify These Settings:

**1. Check `capacitor.config.ts` in kiosk-app-capacitor folder:**
```typescript
const config: CapacitorConfig = {
  appId: 'com.boki.kiosk',
  appName: 'BOKI Kiosk',
  webDir: 'dist-kiosk',
  server: {
    url: 'https://bokifinal.netlify.app/kiosk',
    allowNavigation: ['bokifinal.netlify.app', '*.netlify.app'],
  },
  android: {
    webContentsDebuggingEnabled: true, // Set to false for production
  },
};
```

**2. Check Android Manifest Settings:**
- **Open**: `kiosk-app-capacitor/android/app/src/main/AndroidManifest.xml`
- **Verify**: Orientation and kiosk settings are correct

### Step 5: Configure for Kiosk Mode (Production)

**For true kiosk mode, you'll need to:**
1. **Set as Device Owner** (requires ADB or MDM)
2. **Enable Lock Task Mode**
3. **Configure proper permissions**

**Quick ADB commands for testing:**
```bash
# Install APK
adb install kiosk-app-capacitor/android/app/build/outputs/apk/debug/app-debug.apk

# Set as device owner (for kiosk mode)
adb shell dpm set-device-owner com.boki.kiosk/.AdminReceiver

# Start in lock task mode
adb shell am start --lock-task com.boki.kiosk
```

## 🚨 Common Issues and Solutions

### Issue: Build Fails with "Could not find tools.jar"
**Solution**: Install JDK 11 and set JAVA_HOME

### Issue: "SDK location not found"
**Solution**: Set Android SDK path in local.properties

### Issue: "Failed to find Build Tools"
**Solution**: Install required build tools via SDK Manager

### Issue: App doesn't load remote content
**Solution**: Check internet permission in AndroidManifest.xml

## ✅ Success Indicators

- **Build completes** without errors
- **APK file created** in outputs directory
- **App installs** on Android device
- **App loads** BOKI content from Netlify
- **Kiosk mode** activates automatically

## 🎉 You're Done!

Once you have the APK file, you can:
- Install on Android tablets for restaurant ordering
- Distribute through your preferred method
- Configure kiosk mode for production use

**Your BOKI kiosk app APK is ready for deployment! 🚀**