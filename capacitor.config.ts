import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.mindwell',
  appName: 'MindWell',
  webDir: 'www',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#FFFFFF",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    }
  },
  ios: {
    backgroundColor: "#FFFFFF"
  },
  server: {
    hostname: "app.mindwell.com.br",
    androidScheme: "https",
    iosScheme: "https"
  }
};

export default config;
