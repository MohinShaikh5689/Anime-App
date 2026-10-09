import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAuth } from '@/lib/supabase';
import { useLibrary } from '@/store/library';
import { FONT_ASSETS } from '@/theme/fonts';
import { useStackScreenOptions } from '@/theme/stack-options';
import { AppThemeProvider, useAppTheme } from '@/theme/theme';
import { Type } from '@/theme/type';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.fill}>
      <AppThemeProvider>
        <StatusBar style="auto" />
        <RootStack />
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}

function RootStack() {
  const hydrated = useLibrary((s) => s.hydrated);
  const ready = useAuth((s) => s.ready);
  const signedIn = useAuth((s) => !!s.session);
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  const fontsReady = fontsLoaded || !!fontError;
  const screenOptions = useStackScreenOptions();

  useEffect(() => {
    if (hydrated && ready && fontsReady) SplashScreen.hideAsync();
  }, [hydrated, ready, fontsReady]);

  // Text laid out before Bricolage registers keeps the fallback font's (narrower)
  // measurements on iOS and gets truncated with "…", so nothing renders until fonts are in.
  if (!fontsReady) return null;

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
            title: Platform.OS === 'ios' ? '' : 'Account',
            presentation: 'modal',
            // iOS: the profile's cover wall runs under a see-through bar.
            headerTransparent: Platform.OS === 'ios',
            headerBlurEffect: undefined,
            scrollEdgeEffects: { top: 'hidden' },
            headerLargeTitle: false,
            headerRight: Platform.OS === 'ios' ? () => <DoneButton /> : undefined,
          }}
        />
        <Stack.Screen
          name="chapters/[id]"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.75, 1],
            sheetGrabberVisible: true,
            sheetCornerRadius: 28,
            sheetExpandsWhenScrolledToEdge: true,
          }}
        />
        <Stack.Screen
          name="character/[id]"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.7, 1],
            sheetGrabberVisible: true,
            sheetCornerRadius: 28,
            sheetExpandsWhenScrolledToEdge: true,
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });

function DoneButton() {
  const { colors } = useAppTheme();
  return (
    <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
      <Text style={[Type.headline, { color: colors.primary }]}>Done</Text>
    </Pressable>
  );
}
