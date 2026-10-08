import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import type { ListStatus } from '@/constants/lists';

/**
 * Props shared by the platform implementations in `controls.tsx` (iOS, Liquid Glass)
 * and `controls.android.tsx` (Material 3).
 */
export type ProgressProps = { value: number; total: number | null; color?: ColorValue };

export type IncrementButtonProps = {
  onPress: () => void;
  accessibilityLabel: string;
  /** Current episode count; a "+1" pops out whenever it goes up. */
  value?: number;
};

export type StatusPickerProps = {
  value: ListStatus | undefined;
  onChange: (status: ListStatus) => void;
};

export type EpisodeStepperProps = {
  progress: number;
  episodes: number | null;
  onChange: (progress: number) => void;
};

export type ActionButtonProps = {
  title: string;
  sf?: SFSymbol;
  md?: AndroidSymbol;
  variant?: 'primary' | 'tonal' | 'destructive';
  loading?: boolean;
  disabled?: boolean;
  /** Stretch to the container width. */
  block?: boolean;
  onPress: () => void;
};

export type ChipProps = { label: string; selected: boolean; onPress: () => void };

export type ListSwitcherProps = {
  value: ListStatus;
  onChange: (status: ListStatus) => void;
};
