import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.boki.kiosk',
  appName: 'BOKI Kiosk',
  webDir: 'dist-kiosk',
  server: {
    url: 'https://bokifinal.netlify.app/kiosk',
    allowNavigation: ['bokifinal.netlify.app', '*.netlify.app'],
  },
  android: {
    webContentsDebuggingEnabled: true,
  },
  ios: {
    allowsLinkPreview: false,
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
    StatusBar: {
      style: 'default',
      backgroundColor: '#ffffff',
    },
  },
  cordova: {
    preferences: {
      'Orientation': 'landscape',
      'Fullscreen': 'true',
      'KeepRunning': 'true',
      'DisallowOverscroll': 'true',
      'EnableViewportScale': 'false',
      'AllowInlineMediaPlayback': 'true',
      'MediaPlaybackRequiresUserAction': 'false',
    }
  }
};

export default config;
