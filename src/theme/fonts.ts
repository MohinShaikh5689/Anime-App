import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque/700Bold';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';

/**
 * Bricolage Grotesque is the app's display voice: hero and screen titles, section
 * titles, big numerals. Body text, labels and controls stay in the system face.
 */
export const FONT_ASSETS = { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold };

export const Fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  heading: 'BricolageGrotesque_700Bold',
} as const;
