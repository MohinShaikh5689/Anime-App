/**
 * iOS navigation bars: transparent so iOS 26 renders its Liquid Glass scroll-edge
 * effect, with a system chrome blur on older iOS versions.
 */
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import type { NativeStackNavigationOptions } from 'expo-router';

import { Fonts } from '@/theme/fonts';

const liquidGlass = isLiquidGlassAvailable();

export function useStackScreenOptions(): NativeStackNavigationOptions {
  return {
    headerTransparent: true,
    headerBlurEffect: liquidGlass ? undefined : 'systemChromeMaterial',
    headerShadowVisible: false,
    headerLargeTitleShadowVisible: false,
    headerLargeStyle: { backgroundColor: 'transparent' },
    headerBackButtonDisplayMode: 'minimal',
    headerLargeTitleStyle: { fontFamily: Fonts.display },
    headerTitleStyle: { fontFamily: Fonts.heading },
  };
}

export const rootScreenOptions: NativeStackNavigationOptions = { headerLargeTitle: true };
