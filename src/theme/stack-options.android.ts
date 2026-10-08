/** Android navigation bars styled as Material 3 top app bars. */
import type { NativeStackNavigationOptions } from 'expo-router';
import { useTheme, type MD3Theme } from 'react-native-paper';

import { Fonts } from '@/theme/fonts';

export function useStackScreenOptions(): NativeStackNavigationOptions {
  const { colors } = useTheme<MD3Theme>();
  return {
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.onSurface,
    headerTitleStyle: { fontFamily: Fonts.display },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: colors.background },
    animation: 'fade_from_bottom',
  };
}

export const rootScreenOptions: NativeStackNavigationOptions = {};
