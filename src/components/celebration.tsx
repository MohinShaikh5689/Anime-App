/**
 * A gentle shower of sakura petals and a small note when you finish a show.
 * Triggered by local changes only (not by sync from another device).
 */
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeInUp,
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
import { Fonts } from '@/theme/fonts';

type PetalSeed = {
  key: number;
  /** Horizontal start position, 0–1 of the screen width. */
  x: number;
  size: number;
  delay: number;
  duration: number;
  sway: number;
  spin: number;
  color: string;
};

type Celebration = { id: number; title: string; petals: PetalSeed[] } | null;

const useCelebration = create<{ current: Celebration }>()(() => ({ current: null }));

export function celebrate(title: string) {
  const petals = Array.from({ length: 22 }, (_, i) => ({
    key: i,
    x: Math.random(),
    size: 10 + Math.random() * 10,
    delay: Math.random() * 900,
    duration: 2400 + Math.random() * 1400,
    sway: 20 + Math.random() * 40,
    spin: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360),
    color: PETAL_COLORS[i % PETAL_COLORS.length],
  }));
  useCelebration.setState({ current: { id: Date.now(), title, petals } });
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
            (next.episodes != null &&
              next.progress >= next.episodes &&
              before.progress < next.episodes);
          if (finishedNow) {
            celebrate(next.title);
            return;
          }
        }
      }),
    []
  );
}

const PETAL_COLORS = ['#FFC7D9', '#FFB3CB', '#FFD9E5', '#F9A8C4', '#FFE4EC'];

export function CelebrationOverlay() {
  const current = useCelebration((s) => s.current);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!current) return;
    const id = setTimeout(() => {
      if (useCelebration.getState().current?.id === current.id) {
        useCelebration.setState({ current: null });
      }
    }, 3600);
    return () => clearTimeout(id);
  }, [current]);

  if (!current) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {reduce ? null : <Petals key={current.id} seeds={current.petals} />}
      <Toast key={`t${current.id}`} title={current.title} />
    </View>
  );
}

function Toast({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  return (
    <Animated.View
      entering={FadeInUp.springify().damping(14)}
      exiting={FadeOutUp.duration(300)}
      style={[styles.toast, { top: insets.top + 8 }]}>
      <Text style={styles.toastEmoji}>🌸</Text>
      <View style={styles.toastText}>
        <Text style={styles.toastTitle}>Finished!</Text>
        <Text style={styles.toastBody} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </Animated.View>
  );
}

function Petals({ seeds }: { seeds: PetalSeed[] }) {
  const { width, height } = useWindowDimensions();
  return (
    <>
      {seeds.map(({ key, x, ...p }) => (
        <Petal key={key} {...p} x={x * width} fall={height + 60} />
      ))}
    </>
  );
}

function Petal({
  x,
  size,
  delay,
  duration,
  sway,
  spin,
  color,
  fall,
}: {
  x: number;
  size: number;
  delay: number;
  duration: number;
  sway: number;
  spin: number;
  color: string;
  fall: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay, withTiming(1, { duration, easing: Easing.linear })));
  }, [delay, duration, t]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.85 ? 1 : (1 - t.value) / 0.15,
    transform: [
      { translateX: x + Math.sin(t.value * Math.PI * 3) * sway },
      { translateY: -40 + t.value * fall },
      { rotate: `${t.value * spin}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[
        styles.petal,
        {
          width: size,
          height: size * 0.75,
          backgroundColor: color,
          borderTopLeftRadius: size,
          borderBottomRightRadius: size,
          borderTopRightRadius: size * 0.2,
          borderBottomLeftRadius: size * 0.2,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  petal: { position: 'absolute', top: 0, left: 0 },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    maxWidth: '86%',
    backgroundColor: 'rgba(40, 24, 34, 0.86)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
  },
  toastEmoji: { fontSize: 24 },
  toastText: { flexShrink: 1 },
  toastTitle: { fontFamily: Fonts.display, fontSize: 15, color: '#FFD9E5' },
  toastBody: { fontFamily: Fonts.label, fontSize: 14, color: '#FFFFFF' },
});
