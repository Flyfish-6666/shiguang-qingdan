import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.shiguang.qingdan',
  appName: '拾光清单',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#efd8c3',
    },
    SplashScreen: {
      launchShowDuration: 350,
      launchAutoHide: true,
      backgroundColor: '#f7f3ea',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_INSIDE',
      showSpinner: false,
    },
  },
}

export default config
