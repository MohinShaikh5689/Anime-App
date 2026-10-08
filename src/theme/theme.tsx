/**
 * iOS theme: semantic UIKit system colors via PlatformColor, so light/dark mode,
 * increased contrast and Liquid Glass tinting all follow the system automatically.
 * Android overrides this file with `theme.android.tsx` (Material You).
 */
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { DynamicColorIOS, PlatformColor, useColorScheme } from 'react-native';

import type { AppTheme } from './types';

// Signature electric indigo; white text on it passes AA (4.55:1) in both appearances.
const TINT = { light: '#6C5CFF', dark: '#6C5CFF' };
const tint = DynamicColorIOS(TINT);

const colors: AppTheme['colors'] = {
  background: PlatformColor('systemBackground'),
  surface: PlatformColor('secondarySystemBackground'),
  fill: PlatformColor('tertiarySystemFill'),
  text: PlatformColor('label'),
  textSecondary: PlatformColor('secondaryLabel'),
  primary: tint,
  onPrimary: '#FFFFFF',
  separator: PlatformColor('separator'),
  danger: PlatformColor('systemRed'),
  rule: DynamicColorIOS({ light: '#8FB3DE', dark: '#3B5A80' }),
  ink: DynamicColorIOS({ light: '#2B2D33', dark: '#D9DCE3' }),
  key: DynamicColorIOS({ light: '#D63027', dark: '#FF5A4E' }),
  status: {
    watching: tint,
    wishlist: PlatformColor('secondaryLabel'),
    watched: PlatformColor('label'),
    dropped: PlatformColor('tertiaryLabel'),
  },
};

export function useAppTheme(): AppTheme {
  const dark = useColorScheme() === 'dark';
  return { dark, colors, canvas: dark ? '#000000' : '#FFFFFF' };
}

export function AppThemeProvider({ children }: PropsWithChildren) {
  const dark = useColorScheme() === 'dark';
  const base = dark ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider
      value={{ ...base, colors: { ...base.colors, primary: dark ? TINT.dark : TINT.light } }}>
      {children}
    </ThemeProvider>
  );
}
