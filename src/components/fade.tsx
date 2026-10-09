import { StyleSheet, View, type ViewStyle } from 'react-native';

import { withAlpha } from '@/lib/color';

const STEPS = 16;

/**
 * A vertical fade from transparent to `color`, built from stacked bands so it renders
 * the same everywhere (no reliance on CSS gradients). Eased so the bottom is solid.
 */
export function Fade({
  color,
  height,
  max = 1,
  flip = false,
  style,
}: {
  color: string;
  height: number;
  /** Opacity at the solid end. */
  max?: number;
  /** Solid at the top instead of the bottom. */
  flip?: boolean;
  style?: ViewStyle;
}) {
  return (
    <View pointerEvents="none" style={[{ height }, style]}>
      {Array.from({ length: STEPS }, (_, i) => {
        const t = (flip ? STEPS - i : i + 1) / STEPS;
        const alpha = t * t * (3 - 2 * t) * max;
        return <View key={i} style={[styles.band, { backgroundColor: withAlpha(color, alpha) }]} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({ band: { flex: 1 } });
