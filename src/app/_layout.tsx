import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, Pressable, Text } from 'react-native';

import { useAuth } from '@/lib/supabase';
import { useLibrary } from '@/store/library';
import { useStackScreenOptions } from '@/theme/stack-options';
import { AppThemeProvider, useAppTheme } from '@/theme/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <StatusBar style="auto" />
      <RootStack />
    </AppThemeProvider>
  );
}

function RootStack() {
  const hydrated = useLibrary((s) => s.hydrated);
  const ready = useAuth((s) => s.ready);
  const signedIn = useAuth((s) => !!s.session);
  const screenOptions = useStackScreenOptions();

  useEffect(() => {
    if (hydrated && ready) SplashScreen.hideAsync();
  }, [hydrated, ready]);

  // The splash screen stays up until we know whether someone is signed in.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
        <Stack.Screen
          name="account"
          options={{
            ...screenOptions,
            headerShown: true,
            title: 'Account',
            presentation: 'modal',
            headerTransparent: false,
            headerLargeTitle: false,
            headerRight: Platform.OS === 'ios' ? () => <DoneButton /> : undefined,
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}

function DoneButton() {
  const { colors } = useAppTheme();
  return (
    <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
      <Text style={{ color: colors.primary, fontSize: 17, fontWeight: '600' }}>Done</Text>
    </Pressable>
  );
}
