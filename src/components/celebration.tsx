/**
 * The director's check: when you finish a show on this device, a key-red check is
 * drawn in two pencil strokes (short, then long) and a one-line note names the show.
 * Triggered by local changes only, never by sync from another device.
 */
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  FadeOut,
  FadeOutUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { useLibrary } from '@/store/library';
import { useAppTheme } from '@/theme/theme';
import { Type } from '@/theme/type';

type Celebration = { id: number; title: string } | null;

const useCelebration = create<{ current: Celebration }>()(() => ({ current: null }));

export function celebrate(title: string) {
  useCelebration.setState({ current: { id: Date.now(), title } });
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** Watches the library for shows you just finished on this device. */
export function useFinishCelebrations() {
  useEffect(
    () =>
      useLibrary.subscribe((state, prev) => {
        if (state.entries === prev.entries) return;
        for (const id of Object.keys(state.dirty)) {
          const next = state.entries[Number(id)];
          const before = prev.entries[Number(id)];
          if (!next || !before) continue;
          const finishedNow =
            (next.status === 'watched' && before.status !== 'watched') ||
            (next.episodes != null && next.progress >= next.episodes && before.progress < next.episodes);
          if (finishedNow) {
            celebrate(next.title);
            return;
          }
        }
      }),
    []
  );
}

export function CelebrationOverlay() {
  const current = useCelebration((s) => s.current);
  const reduce = useReducedMotion();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!current) return;
    const id = setTimeout(() => {
      if (useCelebration.getState().current?.id === current.id) useCelebration.setState({ current: null });
    }, 2600);
    return () => clearTimeout(id);
  }, [current]);

  if (!current) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View key={current.id} exiting={FadeOut.duration(260)} style={styles.center}>
        <Check color={colors.key as string} reduce={reduce} />
      </Animated.View>
      <Animated.View
        key={`n${current.id}`}
        entering={FadeInUp.duration(280)}
        exiting={FadeOutUp.duration(220)}
        style={[
          styles.note,
          { top: insets.top + 8, backgroundColor: colors.surface, borderColor: colors.rule as string },
        ]}
        accessibilityLiveRegion="polite">
        <Text style={[Type.headline, { color: colors.text }]} numberOfLines={1}>
          <Text style={{ color: colors.textSecondary }}>Finished · </Text>
          {current.title}
        </Text>
      </Animated.View>
    </View>
  );
}

const STROKE = 10;
const SHORT = 44;
const LONG = 92;

/** Two strokes inside a frame rotated 45°: the short leg, then the long one. */
function Check({ color, reduce }: { color: string; reduce: boolean }) {
  const short = useSharedValue(reduce ? 1 : 0);
  const long = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    const ease = Easing.out(Easing.cubic);
    short.set(withTiming(1, { duration: 160, easing: ease }));
    long.set(withDelay(150, withTiming(1, { duration: 260, easing: ease })));
  }, [reduce, short, long]);
  const shortStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: short.value }] }));
  const longStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: long.value }] }));

  return (
    <Animated.View entering={reduce ? FadeIn.duration(200) : undefined} style={styles.checkFrame}>
      <Animated.View style={[styles.shortLeg, { backgroundColor: color }, shortStyle]} />
      <Animated.View style={[styles.longLeg, { backgroundColor: color }, longStyle]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  checkFrame: { width: SHORT, height: LONG, transform: [{ rotate: '45deg' }, { translateX: -12 }] },
  shortLeg: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: SHORT,
    height: STROKE,
    borderRadius: STROKE / 2,
    transformOrigin: 'left',
  },
  longLeg: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: STROKE,
    height: LONG,
    borderRadius: STROKE / 2,
    transformOrigin: 'bottom',
  },
  note: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '86%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth * 2,
    boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
  },
});
