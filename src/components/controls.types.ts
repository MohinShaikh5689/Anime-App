import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

import type { ListStatus } from '@/constants/lists';

/**
 * Props shared by the platform implementations in `controls.tsx` (iOS, Liquid Glass)
 * and `controls.android.tsx` (Material 3).
 */
export type IncrementButtonProps = {
  onPress: () => void;
  accessibilityLabel: string;
  /** Floats over cover art (Liquid Glass on iOS). */
  floating?: boolean;
};

export type StatusPickerProps = {
  value: ListStatus | undefined;
  onChange: (status: ListStatus) => void;
  /** Accent for the selected option (e.g. the show's colour). */
  color?: string;
  /** Lists the show can't move to yet, with the reason shown on tap. */
  blocked?: Partial<Record<ListStatus, string | null>>;
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
