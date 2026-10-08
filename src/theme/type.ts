import { Platform, type TextStyle } from 'react-native';

/**
 * System text styles: iOS HIG text styles on iPhone, the Material 3 type scale on
 * Android. Sizes scale with the user's font-size setting (Dynamic Type / sp).
 */
const ios = {
  largeTitle: { fontSize: 34, fontWeight: '700', letterSpacing: 0.37 },
  title2: { fontSize: 22, fontWeight: '700', letterSpacing: -0.26 },
  title3: { fontSize: 20, fontWeight: '600', letterSpacing: -0.45 },
  headline: { fontSize: 17, fontWeight: '600', letterSpacing: -0.43 },
  body: { fontSize: 17, fontWeight: '400', letterSpacing: -0.43 },
  subhead: { fontSize: 15, fontWeight: '400', letterSpacing: -0.23 },
  footnote: { fontSize: 13, fontWeight: '400', letterSpacing: -0.08 },
  caption: { fontSize: 12, fontWeight: '400', letterSpacing: 0 },
} satisfies Record<string, TextStyle>;

const android = {
  largeTitle: { fontSize: 32, fontWeight: '400', lineHeight: 40 },
  title2: { fontSize: 22, fontWeight: '400', lineHeight: 28 },
  title3: { fontSize: 20, fontWeight: '500', lineHeight: 26 },
  headline: { fontSize: 16, fontWeight: '500', lineHeight: 24, letterSpacing: 0.15 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24, letterSpacing: 0.5 },
  subhead: { fontSize: 14, fontWeight: '400', lineHeight: 20, letterSpacing: 0.25 },
  footnote: { fontSize: 12, fontWeight: '400', lineHeight: 16, letterSpacing: 0.4 },
  caption: { fontSize: 11, fontWeight: '500', lineHeight: 16, letterSpacing: 0.5 },
} satisfies Record<string, TextStyle>;

export const Type: Record<keyof typeof ios, TextStyle> = Platform.OS === 'ios' ? ios : android;
