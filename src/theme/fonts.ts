import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';

/**
 * Nunito's rounded letterforms give the app its soft, cozy voice. It's used for titles,
 * numbers and labels; long-form text (synopses) stays in the system font.
 */
export const FONT_ASSETS = { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold };

export const Fonts = {
  display: 'Nunito_800ExtraBold',
  heading: 'Nunito_700Bold',
  label: 'Nunito_600SemiBold',
} as const;
