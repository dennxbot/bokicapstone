# 🏪 BOKI Kiosk Mobile App

This is a Capacitor JS wrapper for the BOKI Kiosk system, converting your web-based kiosk into a native mobile application.

## 🚀 Features

- **Native Mobile App**: Converts your web kiosk into iOS/Android apps
- **Kiosk Mode Only**: App automatically runs in kiosk mode
- **Touch Optimized**: Enhanced touch interactions for tablet/phone use
- **Offline Ready**: Works with your hosted backend (https://bokifinal.netlify.app)
- **Cross-Platform**: Supports both Android and iOS

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Android Studio (for Android development)
- Xcode (for iOS development - macOS only)
- Capacitor CLI

## 🛠️ Installation & Setup

### 1. Install Dependencies

```bash
cd kiosk-app-capacitor
npm install
```

### 2. Initialize Capacitor

**Windows:**
```bash
setup-capacitor.bat
```

**macOS/Linux:**
```bash
chmod +x setup-capacitor.sh
./setup-capacitor.sh
```

This will:
- Initialize Capacitor with your app configuration
- Add Android/iOS platforms (you'll be prompted to choose)
- Build the kiosk-optimized version of your app
- Sync everything together

### 3. Build for Production

```bash
# Build kiosk version
npm run build:kiosk

# Sync with native platforms
npm run cap:sync
```

## 📱 Platform-Specific Setup

### Android Setup

1. Open Android Studio
2. Select "Open an existing Android Studio project"
3. Navigate to `android/` folder
4. Wait for Gradle sync to complete
5. Configure signing certificates for release
6. Build and run on device/emulator

### iOS Setup (macOS only)

1. Open Xcode
2. Select "Open a project or file"
3. Navigate to `ios/App/App.xcworkspace`
4. Configure signing and capabilities
5. Select your development team
6. Build and run on device/simulator

## 🚀 Running the App

### Development Mode

```bash
# Run on Android device/emulator
npm run cap:run:android

# Run on iOS device/simulator (macOS only)
npm run cap:run:ios
```

### Production Build

```bash
# Build Android APK
npm run cap:build:android

# Build iOS App (macOS only)
npm run cap:build:ios
```

## 🔧 Configuration

### Capacitor Config (`capacitor.config.ts`)

Key settings for kiosk mode:

```typescript
{
  appId: 'com.boki.kiosk',
  appName: 'BOKI Kiosk',
  webDir: 'dist-kiosk',
  server: {
    url: 'https://bokifinal.netlify.app/kiosk',
    allowNavigation: ['bokifinal.netlify.app', '*.netlify.app'],
  }
}
```

### Kiosk-Specific Features

- **Auto Kiosk Mode**: App automatically enables kiosk authentication
- **Touch Optimizations**: Disabled text selection, improved touch targets
- **Fullscreen Mode**: Hides browser chrome and status bars
- **Landscape Orientation**: Optimized for tablet kiosk stands
- **No Zoom**: Prevents accidental zoom gestures

## 📁 Project Structure

```
kiosk-app-capacitor/
├── capacitor.config.ts     # Capacitor configuration
├── vite.config.kiosk.ts    # Kiosk-specific build config
├── src/
│   ├── main-kiosk.tsx      # Kiosk entry point
│   └── components/
│       └── feature/
│           └── KioskAppWrapper.tsx  # Forces kiosk mode
├── android/                # Android project (generated)
├── ios/                    # iOS project (generated)
├── setup-capacitor.bat     # Windows setup script
├── setup-capacitor.sh      # macOS/Linux setup script
└── package.json           # Dependencies and scripts
```

## 🔒 Security Considerations

- Uses HTTPS for all network requests
- Implements proper CORS policies
- No local data storage (relies on your hosted backend)
- Secure authentication flow through your existing system

## 🐛 Troubleshooting

### Common Issues

1. **Build fails**: Make sure you've run `npm run build:kiosk` before syncing
2. **Platform not found**: Run the setup script again to add platforms
3. **Network errors**: Check your internet connection and CORS settings
4. **Kiosk mode not working**: Verify your hosted URL is accessible

### Debug Mode

Enable debug mode in `capacitor.config.ts`:

```typescript
android: {
  webContentsDebuggingEnabled: true
}
```

## 📱 Deployment

### Android

1. Generate signed APK/AAB in Android Studio
2. Upload to Google Play Console or distribute manually
3. Configure as kiosk device if needed

### iOS

1. Archive and upload to App Store Connect
2. Configure for business/enterprise distribution if needed
3. Set up device management for kiosk mode

## 🔄 Updates

To update the kiosk app:

1. Make changes to your web app and deploy to Netlify
2. Rebuild the kiosk version: `npm run build:kiosk`
3. Sync and rebuild native apps: `npm run cap:sync`
4. Redeploy to app stores

## 📞 Support

The kiosk functionality relies on your hosted backend at:
- **Live URL**: https://bokifinal.netlify.app/kiosk
- **API**: Uses your existing Supabase backend

## 📄 License

Same as your main BOKI project.