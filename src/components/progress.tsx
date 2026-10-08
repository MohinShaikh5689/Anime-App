/**
 * Episode progress in the show's own colour: a segmented bar (one segment per
 * episode for short shows, a continuous bar for long ones) and a row of tappable
 * episode tiles for the anime page.
 */
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { readableOn } from '@/lib/color';
import { Fonts } from '@/theme/fonts';
import { useAppTheme } from '@/theme/theme';
import { Type } from '@/theme/type';

const SEGMENT_MAX = 24;

export function EpisodeBar({
  progress,
  total,
  color,
  height = 5,
  onArt,
}: {
  progress: number;
  total: number | null;
  color: string;
  height?: number;
  /** Over artwork: use a translucent white track instead of the theme fill. */
  onArt?: boolean;
}) {
  const { colors } = useAppTheme();
  const track = onArt ? 'rgba(255,255,255,0.28)' : (colors.fill as string);
  const label = `Episode ${progress}${total ? ` of ${total}` : ''}`;

  if (total && total <= SEGMENT_MAX) {
    return (
      <View style={[styles.segments, { height }]} accessible accessibilityRole="progressbar" accessibilityLabel={label}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={[styles.segment, { backgroundColor: i < progress ? color : track, borderRadius: height / 2 }]}
          />
        ))}
      </View>
    );
  }
  const ratio = total ? Math.min(1, progress / total) : Math.min(1, progress / (progress + 12));
  return <FillBar ratio={ratio} color={color} track={track} height={height} label={label} />;
}

function FillBar({ ratio, color, track, height, label }: { ratio: number; color: string; track: string; height: number; label: string }) {
  const reduce = useReducedMotion();
  const w = useSharedValue(ratio);
  useEffect(() => {
    w.set(withTiming(ratio, { duration: reduce ? 0 : 420, easing: Easing.out(Easing.cubic) }));
  }, [ratio, reduce, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: track }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}>
      <Animated.View style={[styles.fill, { backgroundColor: color, borderRadius: height / 2 }, fill]} />
    </View>
  );
}

const TILE = 52;

/** Every episode as a tile; tapping one marks everything up to it as watched. */
export function EpisodeTiles({
  progress,
  total,
  aired,
  color,
  onSet,
}: {
  progress: number;
  total: number | null;
  /** Episodes released so far; later tiles are locked. Null when unknown. */
  aired?: number | null;
  color: string;
  onSet: (episode: number) => void;
}) {
  const { colors } = useAppTheme();
  const list = useRef<FlatList<number>>(null);
  const count = total ?? (aired != null ? Math.max(aired + 1, progress) : progress + 12);
  const data = Array.from({ length: count }, (_, i) => i + 1);
  const next = Math.min(progress + 1, count);
  const onColor = readableOn(color);

  useEffect(() => {
    const id = setTimeout(() => {
      list.current?.scrollToIndex({ index: Math.max(next - 3, 0), animated: true });
    }, 250);
    return () => clearTimeout(id);
  }, [next]);

  return (
    <FlatList
      ref={list}
      horizontal
      data={data}
      keyExtractor={(n) => String(n)}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tiles}
      getItemLayout={(_, index) => ({ length: TILE + 8, offset: (TILE + 8) * index, index })}
      initialNumToRender={20}
      renderItem={({ item: n }) => {
        const watched = n <= progress;
        const locked = aired != null && n > aired;
        const isNext = !locked && n === progress + 1 && (total == null || progress < total);
        return (
          <Pressable
            disabled={locked}
            onPress={() => {
              Haptics.selectionAsync();
              onSet(n === progress ? n - 1 : n);
            }}
            accessibilityRole="button"
            accessibilityState={{ disabled: locked }}
            accessibilityLabel={`Episode ${n}${watched ? ', watched' : isNext ? ', up next' : locked ? ', not aired yet' : ''}`}
            style={({ pressed }) => [
              styles.tile,
              locked && styles.locked,
              {
                backgroundColor: watched ? color : locked ? 'transparent' : (colors.surface as string),
                borderColor: isNext ? color : locked ? (colors.separator as string) : 'transparent',
                opacity: pressed ? 0.7 : 1,
              },
            ]}>
            <Text
              maxFontSizeMultiplier={1.3}
              style={[
                styles.tileNumber,
                { color: watched ? onColor : isNext ? color : locked ? (colors.textSecondary as string) : (colors.text as string) },
              ]}>
              {n}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

/** "Episode 5 of 12" readout. */
export function EpisodeLabel({ progress, total }: { progress: number; total: number | null }) {
  const { colors } = useAppTheme();
  return (
    <Text style={[Type.footnote, { color: colors.textSecondary }]} maxFontSizeMultiplier={1.4}>
      {progress === 0 ? 'Not started' : `Episode ${progress}${total ? ` of ${total}` : ''}`}
    </Text>
  );
}

const styles = StyleSheet.create({
  segments: { flexDirection: 'row', gap: 3 },
  segment: { flex: 1 },
  track: { overflow: 'hidden', width: '100%' },
  fill: { height: '100%' },
  tiles: { paddingHorizontal: 20, gap: 8 },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locked: { borderStyle: 'dashed' },
  tileNumber: { fontFamily: Fonts.display, fontSize: 18 },
});
