import { BarlowCondensed_600SemiBold } from '@expo-google-fonts/barlow-condensed/600SemiBold';
import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';

/**
 * Barlow Condensed is the timing sheet's numeral hand: episode, frame and count
 * numerals only (measurement). All other text uses the system face (SF / Roboto)
 * so it follows Dynamic Type and platform conventions.
 */
export const FONT_ASSETS = { BarlowCondensed_600SemiBold, BarlowCondensed_700Bold };

export const Fonts = {
  numeral: 'BarlowCondensed_600SemiBold',
  numeralBold: 'BarlowCondensed_700Bold',
} as const;
