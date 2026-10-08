/**
 * Android theme: Material 3 via react-native-paper, seeded from the wallpaper
 * (Material You dynamic color) on Android 12+, with a fixed seed color fallback.
 */
import { useMaterial3Theme } from '@pchmn/expo-material3-theme';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { AndroidSymbol } from 'expo-symbols';
import { type PropsWithChildren, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider, useTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

import type { AppTheme } from './types';

// Blue pencil: the fallback seed when the device has no dynamic colour.
const SEED_COLOR = '#2F6BD8';

export function useAppTheme(): AppTheme {
  const theme = useTheme<MD3Theme>();
  const c = theme.colors;
  return useMemo(
    () => ({
      dark: theme.dark,
      colors: {
        background: c.background,
        surface: c.elevation.level1,
        fill: c.surfaceVariant,
        text: c.onSurface,
        textSecondary: c.onSurfaceVariant,
        primary: c.primary,
        onPrimary: c.onPrimary,
        separator: c.outlineVariant,
        danger: c.error,
        // The sheet's own ruling and graphite stay fixed so the timing sheet reads on Android too.
        rule: theme.dark ? '#3B5A80' : '#8FB3DE',
        ink: theme.dark ? '#D9DCE3' : '#2B2D33',
        key: theme.dark ? '#FF5A4E' : '#D63027',
        status: {
          watching: c.primary,
          wishlist: c.onSurfaceVariant,
          watched: c.onSurface,
          dropped: c.outline,
        },
      },
    }),
    [theme, c]
  );
}

/** Lets Paper components render Material Symbols through expo-symbols. */
function PaperIcon({ name, color, size }: { name: string; color?: string; size: number }) {
  return <SymbolView name={{ android: name as AndroidSymbol }} tintColor={color} size={size} />;
}

export function AppThemeProvider({ children }: PropsWithChildren) {
  const dark = useColorScheme() === 'dark';
  const { theme: m3 } = useMaterial3Theme({ fallbackSourceColor: SEED_COLOR });

  const paperTheme = useMemo<MD3Theme>(
    () =>
      dark
        ? { ...MD3DarkTheme, colors: { ...MD3DarkTheme.colors, ...m3.dark } }
        : { ...MD3LightTheme, colors: { ...MD3LightTheme.colors, ...m3.light } },
    [dark, m3]
  );

  const navTheme = useMemo(() => {
    const base = dark ? DarkTheme : DefaultTheme;
    const c = paperTheme.colors;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: c.primary,
        background: c.background,
        card: c.surface,
        text: c.onSurface,
        border: c.outlineVariant,
        notification: c.error,
      },
    };
  }, [dark, paperTheme]);

  return (
    <PaperProvider theme={paperTheme} settings={{ icon: PaperIcon }}>
      <ThemeProvider value={navTheme}>{children}</ThemeProvider>
    </PaperProvider>
  );
}
