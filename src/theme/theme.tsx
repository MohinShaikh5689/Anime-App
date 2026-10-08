/**
 * iOS theme: semantic UIKit system colors via PlatformColor, so light/dark mode,
 * increased contrast and Liquid Glass tinting all follow the system automatically.
 * Android overrides this file with `theme.android.tsx` (Material You).
 */
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { PlatformColor, useColorScheme } from 'react-native';

import type { AppTheme } from './types';

const ACCENT = { light: '#FF2D55', dark: '#FF375F' }; // systemPink

const colors: AppTheme['colors'] = {
  background: PlatformColor('systemGroupedBackground'),
  surface: PlatformColor('secondarySystemGroupedBackground'),
  fill: PlatformColor('tertiarySystemFill'),
  text: PlatformColor('label'),
  textSecondary: PlatformColor('secondaryLabel'),
  primary: PlatformColor('systemPink'),
  onPrimary: '#FFFFFF',
  separator: PlatformColor('separator'),
  danger: PlatformColor('systemRed'),
  status: {
    watching: PlatformColor('systemBlue'),
    wishlist: PlatformColor('systemOrange'),
    watched: PlatformColor('systemGreen'),
    dropped: PlatformColor('systemGray'),
  },
};

export function useAppTheme(): AppTheme {
  const dark = useColorScheme() === 'dark';
  // systemGroupedBackground
  return { dark, colors, backgroundHex: dark ? '#000000' : '#F2F2F7' };
}

export function AppThemeProvider({ children }: PropsWithChildren) {
  const dark = useColorScheme() === 'dark';
  const base = dark ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider
      value={{ ...base, colors: { ...base.colors, primary: dark ? ACCENT.dark : ACCENT.light } }}>
      {children}
    </ThemeProvider>
  );
}
