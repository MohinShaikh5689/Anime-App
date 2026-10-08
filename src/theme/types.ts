import type { ColorValue } from 'react-native';

import type { ListStatus } from '@/constants/lists';

export type AppColors = {
  /** Screen background. */
  background: ColorValue;
  /** Raised content such as cards and grouped rows. */
  surface: ColorValue;
  /** Subtle fills: progress tracks, placeholders, tonal buttons. */
  fill: ColorValue;
  text: ColorValue;
  textSecondary: ColorValue;
  primary: ColorValue;
  onPrimary: ColorValue;
  separator: ColorValue;
  danger: ColorValue;
  /** Timing-sheet ruling: hairlines that structure sheets, lists and shelves. */
  rule: ColorValue;
  /** Graphite: inked (watched) frames. */
  ink: ColorValue;
  /** Key red, reserved for the next frame and the finish check. Nothing else. */
  key: ColorValue;
  status: Record<ListStatus, ColorValue>;
};

export type AppTheme = { dark: boolean; colors: AppColors };
