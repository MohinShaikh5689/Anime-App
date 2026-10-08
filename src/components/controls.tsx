/**
 * iOS controls. In-content buttons use the system filled and tinted styles; Liquid
 * Glass (iOS 26, `expo-glass-effect`, with a material blur fallback) is reserved for
 * the one floating control, the +1 that sits over cover art.
 * Android uses `controls.android.tsx`.
 */
import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Alert, Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import type {
  ActionButtonProps,
  ChipProps,
  EpisodeStepperProps,
  IncrementButtonProps,
  SegmentedProps,
  StatusPickerProps,
} from './controls.types';
import { Icon } from '@/components/icon';
import { LIST_STATUSES, listMeta } from '@/constants/lists';
import { readableOn } from '@/lib/color';
import { Fonts } from '@/theme/fonts';
import { useAppTheme } from '@/theme/theme';
import { Type } from '@/theme/type';

const liquidGlass = isLiquidGlassAvailable();

/** Liquid Glass for floating chrome only, with the system material on iOS < 26. */
function FloatingGlass({ style, children }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  if (liquidGlass) {
    return (
      <GlassView glassEffectStyle="regular" isInteractive style={style}>
        {children}
      </GlassView>
    );
  }
  return (
    <BlurView tint="systemChromeMaterial" intensity={100} style={[styles.clip, style]}>
      {children}
    </BlurView>
  );
}

export function IncrementButton({ onPress, accessibilityLabel, floating }: IncrementButtonProps) {
  const { colors } = useAppTheme();
  const icon = <Icon sf="plus" md="add" size={18} color={colors.primary} />;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => pressed && styles.pressed}>
      {floating ? (
        <FloatingGlass style={styles.circle}>{icon}</FloatingGlass>
      ) : (
        <View style={[styles.circle, { backgroundColor: colors.fill }]}>{icon}</View>
      )}
    </Pressable>
  );
}

export function StatusPicker({ value, onChange, color, blocked, manga }: StatusPickerProps) {
  const { colors } = useAppTheme();
  const accent = color ?? (colors.primary as string);
  const onAccent = color ? readableOn(color) : colors.onPrimary;
  return (
    <View style={styles.statusGrid} accessibilityRole="radiogroup">
      {LIST_STATUSES.map((status) => {
        const meta = listMeta(status, manga);
        const selected = value === status;
        const reason = selected ? null : blocked?.[status];
        const fg = selected ? onAccent : colors.text;
        return (
          <Pressable
            key={status}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled: !!reason }}
            accessibilityHint={reason ?? undefined}
            onPress={() => {
              if (reason) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                Alert.alert(`Can't move to ${meta.title}`, reason);
                return;
              }
              Haptics.selectionAsync();
              onChange(status);
            }}
            style={({ pressed }) => [
              styles.statusCell,
              styles.statusPill,
              { backgroundColor: selected ? accent : colors.fill },
              reason && styles.disabled,
              pressed && styles.pressed,
            ]}>
            <Icon sf={selected ? meta.sfSelected : meta.sf} md={meta.md} size={17} color={selected ? fg : accent} />
            <Text style={[styles.statusLabel, { color: fg }]} numberOfLines={1}>
              {meta.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function EpisodeStepper({ progress, episodes, onChange }: EpisodeStepperProps) {
  const { colors } = useAppTheme();
  const atMax = episodes != null && progress >= episodes;
  const step = (delta: number) => {
    Haptics.selectionAsync();
    onChange(progress + delta);
  };
  const button = (sf: 'minus' | 'plus', md: 'remove' | 'add', label: string, disabled: boolean, delta: number) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => step(delta)}
      style={({ pressed }) => [
        styles.stepButton,
        { backgroundColor: colors.fill },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}>
      <Icon sf={sf} md={md} size={20} color={colors.primary} />
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      {button('minus', 'remove', 'Previous episode', progress <= 0, -1)}
      <Text style={[styles.stepCount, { color: colors.text }]} accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.6}>
        <Text style={{ color: colors.textSecondary }}>EP </Text>
        {String(progress).padStart(2, '0')}
        <Text style={{ color: colors.textSecondary }}> / {episodes ?? '?'}</Text>
      </Text>
      {button('plus', 'add', 'Next episode', atMax, 1)}
    </View>
  );
}

export function ActionButton({ title, sf, md, variant = 'tonal', loading, disabled, block, onPress }: ActionButtonProps) {
  const { colors } = useAppTheme();
  const inactive = disabled || loading;
  const fg = variant === 'primary' ? colors.onPrimary : variant === 'destructive' ? colors.danger : colors.primary;
  const bg = variant === 'primary' ? colors.primary : variant === 'tonal' ? colors.fill : 'transparent';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: bg },
        block && styles.block,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg as string} />
      ) : (
        <>
          {sf && md ? <Icon sf={sf} md={md} size={17} color={fg} /> : null}
          <Text style={[styles.actionLabel, { color: fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Native segmented control for any short set of options. */
export function Segmented({ values, selectedIndex, onChange }: SegmentedProps) {
  return (
    <SegmentedControl
      values={values}
      selectedIndex={selectedIndex}
      onChange={(e) => onChange(e.nativeEvent.selectedSegmentIndex)}
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
      hitSlop={{ top: 6, bottom: 6 }}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? colors.primary : colors.fill },
        pressed && styles.pressed,
      ]}>
      <Text style={[Type.subhead, { color: selected ? colors.onPrimary : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.35 },
  switcher: { marginHorizontal: 16 },
  block: { alignSelf: 'stretch' },
  chip: { minHeight: 34, paddingHorizontal: 14, borderRadius: 17, justifyContent: 'center' },
  circle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusCell: { flexBasis: '48%', flexGrow: 1 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  statusLabel: { ...Type.subhead, fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  stepCount: { fontFamily: Fonts.display, fontSize: 28, fontVariant: ['tabular-nums'] },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  actionLabel: { ...Type.headline },
});
