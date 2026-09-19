import { useEffect } from 'react';
import { NativeModules, LogBox } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.hideAsync();

if (__DEV__) {
  LogBox.ignoreAllLogs();
}

export default function App() {
  useEffect(() => {
    // Ensure Guardian Overlay Foreground Service is running
    const { GuardianBridgeModule } = NativeModules;
    if (GuardianBridgeModule?.startOverlay) {
      GuardianBridgeModule.startOverlay(
        'child_aarav',
        'Aarav',
        'http://10.0.2.2:3001/api'
      ).catch((err: any) => {
        console.warn('Guardian Overlay init error:', err);
      });
    }
  }, []);

  // Return completely empty UI - pure background overlay daemon
  return null;
}
