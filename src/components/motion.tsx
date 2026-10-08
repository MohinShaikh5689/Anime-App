/**
 * Small, calm motion primitives built on Reanimated (already in the native build).
 * Motion is soft spring-based, and respects the system Reduce Motion setting.
 */
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { forwardRef, type PropsWithChildren, useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  type PressableProps,
  StyleSheet,
  type View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  FadeOut,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { useAppTheme } from '@/theme/theme';
import { Fonts } from '@/theme/fonts';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING = { damping: 15, stiffness: 220, mass: 0.6, reduceMotion: ReduceMotion.System };

type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** How far to shrink while pressed. */
  scaleTo?: number;
  haptic?: boolean;
};

/** A pressable that sinks softly under your finger and springs back. */
export const PressableScale = forwardRef<View, PressableScaleProps>(function PressableScale(
  { style, scaleTo = 0.96, haptic, onPressIn, onPressOut, onPress, ...rest },
  ref
) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      ref={ref}
      {...rest}
      onPressIn={(e) => {
        scale.set(withSpring(scaleTo, SPRING));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, SPRING));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic && Platform.OS === 'ios') Haptics.selectionAsync();
        onPress?.(e);
      }}
      style={[style, animated]}
    />
  );
});

/** Slow "breathing" scale, for empty-state illustrations. */
export function Breathing({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.set(withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduce, t]);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + t.value * 0.06 }, { translateY: -t.value * 4 }],
  }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/**
 * A heavily blurred copy of the cover art that tints the top of a screen and fades into
 * the background, so every screen takes on the mood of what you're watching.
 */
export function AmbientBackdrop({
  uri,
  color,
  height = 420,
  style,
}: {
  uri: string | null | undefined;
  color?: string | null;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { dark, backgroundHex } = useAppTheme();
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.backdrop, { height }, style]}
      exiting={FadeOut.duration(300)}>
      {color ? (
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity: dark ? 0.35 : 0.3 }]}
        />
      ) : null}
      {uri ? (
        <Image
          source={{ uri }}
          style={[StyleSheet.absoluteFill, { opacity: dark ? 0.55 : 0.6 }]}
          contentFit="cover"
          blurRadius={Platform.OS === 'ios' ? 60 : 30}
          transition={600}
        />
      ) : null}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            experimental_backgroundImage: `linear-gradient(to bottom, ${hexA(backgroundHex, 0)} 0%, ${hexA(backgroundHex, 0.35)} 45%, ${backgroundHex} 100%)`,
          },
        ]}
      />
    </Animated.View>
  );
}

/** A "+1" that pops up and drifts away whenever `value` increases. */
export function PlusOne({ value, color }: { value: number; color?: string }) {
  const { colors } = useAppTheme();
  const [bursts, setBursts] = useState<number[]>([]);
  const [last, setLast] = useState(value);

  if (value !== last) {
    setLast(value);
    if (value > last) setBursts((b) => [...b.slice(-2), value]);
  }

  return (
    <>
      {bursts.map((id) => (
        <Rising key={id} onDone={() => setBursts((b) => b.filter((x) => x !== id))}>
          <Animated.Text style={[styles.plusOne, { color: color ?? colors.primary }]}>+1</Animated.Text>
        </Rising>
      ))}
    </>
  );
}

function Rising({ children, onDone }: PropsWithChildren<{ onDone: () => void }>) {
  const y = useSharedValue(0);
  const opacity = useSharedValue(1);
  useEffect(() => {
    y.set(withTiming(-34, { duration: 700, easing: Easing.out(Easing.cubic) }));
    opacity.set(withSequence(withTiming(1, { duration: 350 }), withTiming(0, { duration: 350 })));
    const id = setTimeout(onDone, 750);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const animated = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      entering={ZoomIn.springify().damping(12)}
      style={[styles.rising, animated]}>
      {children}
    </Animated.View>
  );
}

/** Adds alpha to a #RRGGBB color. */
export function hexA(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${h}${a}`;
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  plusOne: { fontFamily: Fonts.display, fontSize: 18 },
  rising: { position: 'absolute', top: -6, alignSelf: 'center' },
});
