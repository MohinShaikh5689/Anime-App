/**
 * iOS controls built on Liquid Glass (iOS 26+, `expo-glass-effect`), falling back to
 * a system material blur (`expo-blur`) on older iOS versions and in builds without
 * the glass API. Android uses `controls.android.tsx`.
 */
import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { BlurView } from 'expo-blur';
import { GlassContainer, GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import type { PropsWithChildren } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import type {
  ActionButtonProps,
  ChipProps,
  EpisodeStepperProps,
  IncrementButtonProps,
  ListSwitcherProps,
  ProgressProps,
  StatusPickerProps,
} from './controls.types';
import { Icon } from '@/components/icon';
import { LIST_STATUSES, LISTS } from '@/constants/lists';
import { useAppTheme } from '@/theme/theme';

const liquidGlass = isLiquidGlassAvailable();

type GlassProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  tint?: ViewStyle['backgroundColor'];
  interactive?: boolean;
}>;

/** A Liquid Glass surface, or a translucent blur on iOS < 26. */
export function Glass({ style, tint, interactive, children }: GlassProps) {
  if (liquidGlass) {
    return (
      <GlassView
        glassEffectStyle="regular"
        isInteractive={interactive}
        tintColor={tint}
        style={style}>
        {children}
      </GlassView>
    );
  }
  return (
    <BlurView
      tint="systemThinMaterial"
      intensity={90}
      style={[styles.blurClip, style, tint != null && { backgroundColor: tint }]}>
      {children}
    </BlurView>
  );
}

export function Progress({ value, total, color }: ProgressProps) {
  const { colors } = useAppTheme();
  const ratio = total ? Math.min(1, value / total) : 0;
  return (
    <View style={[styles.track, { backgroundColor: colors.fill }]}>
      <View
        style={[styles.bar, { width: `${ratio * 100}%`, backgroundColor: color ?? colors.primary }]}
      />
    </View>
  );
}

export function IncrementButton({ onPress, accessibilityLabel }: IncrementButtonProps) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}>
      <Glass interactive style={styles.circle}>
        <Icon sf="plus" md="add" size={18} color={colors.primary} />
      </Glass>
    </Pressable>
  );
}

export function StatusPicker({ value, onChange }: StatusPickerProps) {
  const { colors } = useAppTheme();
  return (
    <GlassContainer spacing={8} style={styles.statusGrid}>
      {LIST_STATUSES.map((status) => {
        const meta = LISTS[status];
        const selected = value === status;
        const fg = selected ? '#FFFFFF' : colors.text;
        return (
          <Pressable
            key={status}
            style={styles.statusCell}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(status);
            }}>
            <Glass
              interactive
              tint={selected ? (colors.status[status] as string) : undefined}
              style={styles.statusPill}>
              <Icon
                sf={selected ? meta.sfSelected : meta.sf}
                md={meta.md}
                size={18}
                color={selected ? fg : colors.status[status]}
              />
              <Text style={[styles.statusLabel, { color: fg }]}>{meta.title}</Text>
            </Glass>
          </Pressable>
        );
      })}
    </GlassContainer>
  );
}

export function EpisodeStepper({ progress, episodes, onChange }: EpisodeStepperProps) {
  const { colors } = useAppTheme();
  const atMax = episodes != null && progress >= episodes;
  const step = (delta: number) => {
    Haptics.selectionAsync();
    onChange(progress + delta);
  };
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous episode"
        disabled={progress <= 0}
        onPress={() => step(-1)}>
        <Glass interactive style={[styles.stepButton, progress <= 0 && styles.disabled]}>
          <Icon sf="minus" md="remove" size={20} color={colors.text} />
        </Glass>
      </Pressable>
      <View style={styles.stepValue} accessibilityLiveRegion="polite">
        <Text style={[styles.stepCount, { color: colors.text }]}>
          {progress}
          <Text style={{ color: colors.textSecondary }}> / {episodes ?? '?'}</Text>
        </Text>
        <Text style={[styles.stepCaption, { color: colors.textSecondary }]}>episodes</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next episode"
        disabled={atMax}
        onPress={() => step(1)}>
        <Glass interactive style={[styles.stepButton, atMax && styles.disabled]}>
          <Icon sf="plus" md="add" size={20} color={colors.text} />
        </Glass>
      </Pressable>
    </View>
  );
}

export function ActionButton({ title, sf, md, variant = 'tonal', onPress }: ActionButtonProps) {
  const { colors } = useAppTheme();
  const color =
    variant === 'primary' ? '#FFFFFF' : variant === 'destructive' ? colors.danger : colors.primary;
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Glass
        interactive
        tint={variant === 'primary' ? (colors.primary as string) : undefined}
        style={styles.action}>
        {sf && md ? <Icon sf={sf} md={md} size={17} color={color} /> : null}
        <Text style={[styles.actionLabel, { color }]}>{title}</Text>
      </Glass>
    </Pressable>
  );
}

/** Native UISegmentedControl (SwiftUI segmented Picker via @expo/ui). */
export function ListSwitcher({ value, onChange }: ListSwitcherProps) {
  return (
    <SegmentedControl
      values={LIST_STATUSES.map((s) => LISTS[s].title)}
      selectedIndex={LIST_STATUSES.indexOf(value)}
      onChange={(e) => {
        const next = LIST_STATUSES[e.nativeEvent.selectedSegmentIndex];
        if (next) onChange(next);
      }}
      style={styles.switcher}
    />
  );
}

export function Chip({ label, selected, onPress }: ChipProps) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? colors.primary : colors.fill },
        pressed && { opacity: 0.7 },
      ]}>
      <Text style={[styles.chipLabel, { color: selected ? colors.onPrimary : colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  switcher: { marginHorizontal: 16 },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 17, justifyContent: 'center' },
  chipLabel: { fontSize: 15, fontWeight: '500' },
  blurClip: { overflow: 'hidden' },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 2 },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusCell: { flexBasis: '48%', flexGrow: 1 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 22,
  },
  statusLabel: { fontSize: 15, fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  stepValue: { alignItems: 'center' },
  stepCount: { fontSize: 28, fontWeight: '700', fontVariant: ['tabular-nums'] },
  stepCaption: { fontSize: 13 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  actionLabel: { fontSize: 17, fontWeight: '600' },
});
