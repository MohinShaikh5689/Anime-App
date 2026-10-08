/** Android navigation bars styled as Material 3 top app bars. */
import type { NativeStackNavigationOptions } from 'expo-router';
import { useTheme, type MD3Theme } from 'react-native-paper';

export function useStackScreenOptions(): NativeStackNavigationOptions {
  const { colors, fonts } = useTheme<MD3Theme>();
  return {
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.onSurface,
    headerTitleStyle: { fontFamily: fonts.titleLarge.fontFamily, fontWeight: '400' },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: colors.background },
    animation: 'fade_from_bottom',
  };
}

export const rootScreenOptions: NativeStackNavigationOptions = {};
