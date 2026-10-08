import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import AppTabs from '@/components/app-tabs';
import { useLibrary } from '@/store/library';
import { AppThemeProvider } from '@/theme/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hydrated = useLibrary((s) => s.hydrated);

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync();
  }, [hydrated]);

  return (
    <AppThemeProvider>
      <StatusBar style="auto" />
      <AppTabs />
    </AppThemeProvider>
  );
}
