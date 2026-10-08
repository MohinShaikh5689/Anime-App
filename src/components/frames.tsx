/**
 * The timing sheet: episode progress drawn as frames. Watched frames are inked in
 * graphite, the next frame is outlined in key red, and the rest are ruled in
 * non-photo blue. Logging an episode inks the next frame with a short pencil sweep.
 */
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { Fonts } from '@/theme/fonts';
import { useAppTheme } from '@/theme/theme';
import { Type } from '@/theme/type';

const STRIP_MAX = 26;

/** Which cell was just inked, so only that one animates. */
function useJustInked(progress: number) {
  const [last, setLast] = useState(progress);
  const [inked, setInked] = useState<number | null>(null);
  if (progress !== last) {
    setLast(progress);
    setInked(progress > last ? progress - 1 : null);
  }
  return inked;
}

/** The pencil sweep: left to right, or a short crossfade under Reduce Motion. */
function InkFill({ color, animate }: { color: string; animate: boolean }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (animate) {
      t.set(withTiming(1, { duration: reduce ? 200 : 420, easing: Easing.out(Easing.exp) }));
    }
  }, [animate, reduce, t]);
  const style = useAnimatedStyle(() =>
    reduce ? { opacity: t.value } : { transform: [{ scaleX: t.value }] }
  );
  return <Animated.View style={[StyleSheet.absoluteFill, styles.fillOrigin, { backgroundColor: color }, style]} />;
}

/** Compact strip for rows and covers. Shows a window of frames around the next one. */
export function FrameStrip({
  progress,
  total,
  height = 10,
}: {
  progress: number;
  total: number | null;
  height?: number;
}) {
  const { colors } = useAppTheme();
  const inked = useJustInked(progress);
  const known = total ?? Math.max(progress + 4, 12);
  const count = Math.min(known, STRIP_MAX);
  const start = known <= STRIP_MAX ? 0 : Math.min(Math.max(progress - 12, 0), known - STRIP_MAX);

  return (
    <View
      style={[styles.strip, { height }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Episode ${progress}${total ? ` of ${total}` : ''}`}>
      {Array.from({ length: count }, (_, i) => {
        const index = start + i;
        const watched = index < progress;
        const next = index === progress && (total == null || progress < total);
        const unknown = total == null && index >= progress + 1;
        return (
          <View
            key={index}
            style={[
              styles.cell,
              {
                borderColor: next ? (colors.key as string) : (colors.rule as string),
                borderWidth: next ? 1.5 : StyleSheet.hairlineWidth * 2,
                borderStyle: unknown ? 'dashed' : 'solid',
              },
            ]}>
            {watched ? <InkFill color={colors.ink as string} animate={index === inked} /> : null}
          </View>
        );
      })}
    </View>
  );
}

/** "EP 06 / 12" in the sheet's numeral hand, right-aligned and tabular. */
export function EpisodeReadout({
  progress,
  total,
  size = 17,
}: {
  progress: number;
  total: number | null;
  size?: number;
}) {
  const { colors } = useAppTheme();
  return (
    <Text
      style={[styles.readout, { fontSize: size, color: colors.text }]}
      maxFontSizeMultiplier={1.4}
      accessibilityLabel={`Episode ${progress}${total ? ` of ${total}` : ''}`}>
      <Text style={{ color: colors.textSecondary }}>EP </Text>
      {String(progress).padStart(2, '0')}
      <Text style={{ color: colors.textSecondary }}> / {total ?? '?'}</Text>
    </Text>
  );
}

const CELL_MIN = 48;
const GAP = 6;
const PAGE = 60;

/** The full sheet on the anime page: every episode as a numbered, tappable frame. */
export function FrameSheet({
  progress,
  total,
  onSet,
}: {
  progress: number;
  total: number | null;
  onSet: (episode: number) => void;
}) {
  const { colors } = useAppTheme();
  const inked = useJustInked(progress);
  const [width, setWidth] = useState(0);
  const known = total ?? progress + 12;
  const paged = known > 120;
  const [page, setPage] = useState(() => (paged ? Math.floor(Math.max(progress - 1, 0) / PAGE) : 0));
  const pages = paged ? Math.ceil(known / PAGE) : 1;
  const from = paged ? page * PAGE : 0;
  const to = paged ? Math.min(from + PAGE, known) : known;

  const columns = width ? Math.max(5, Math.floor((width + GAP) / (CELL_MIN + GAP))) : 0;
  const size = columns ? (width - GAP * (columns - 1)) / columns : 0;

  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.floor(e.nativeEvent.layout.width));

  return (
    <View onLayout={onLayout}>
      {paged ? (
        <View style={styles.pager}>
          <Pressable
            disabled={page === 0}
            onPress={() => setPage((p) => p - 1)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Earlier episodes"
            style={[styles.pagerButton, page === 0 && styles.disabled]}>
            <Icon sf="chevron.left" md="chevron_left" size={18} color={colors.primary} />
          </Pressable>
          <Text style={[styles.pagerLabel, { color: colors.textSecondary }]}>
            {from + 1}–{to}
          </Text>
          <Pressable
            disabled={page >= pages - 1}
            onPress={() => setPage((p) => p + 1)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Later episodes"
            style={[styles.pagerButton, page >= pages - 1 && styles.disabled]}>
            <Icon sf="chevron.right" md="chevron_right" size={18} color={colors.primary} />
          </Pressable>
        </View>
      ) : null}
      {columns ? (
        <View style={[styles.grid, { gap: GAP }]}>
          {Array.from({ length: to - from }, (_, i) => {
            const n = from + i + 1;
            const watched = n <= progress;
            const next = n === progress + 1 && (total == null || progress < total);
            return (
              <Pressable
                key={n}
                onPress={() => {
                  Haptics.selectionAsync();
                  onSet(n === progress ? n - 1 : n);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Episode ${n}${watched ? ', watched' : next ? ', next' : ''}`}
                accessibilityHint={n === progress ? 'Unmarks this episode' : 'Marks episodes up to here as watched'}
                style={({ pressed }) => [
                  styles.frame,
                  {
                    width: size,
                    height: size * 0.72,
                    borderColor: next ? (colors.key as string) : (colors.rule as string),
                    borderWidth: next ? 2 : StyleSheet.hairlineWidth * 2,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}>
                {watched ? <InkFill color={colors.ink as string} animate={n - 1 === inked} /> : null}
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={[
                    styles.frameNumber,
                    {
                      color: watched
                        ? (colors.background as string)
                        : next
                          ? (colors.key as string)
                          : (colors.textSecondary as string),
                    },
                  ]}>
                  {n}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: 2 },
  cell: { flex: 1, borderRadius: 2, overflow: 'hidden' },
  fillOrigin: { transformOrigin: 'left' },
  readout: { fontFamily: Fonts.numeral, fontVariant: ['tabular-nums'], letterSpacing: 0.2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  frame: {
    borderRadius: 4,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  frameNumber: { fontFamily: Fonts.numeral, fontSize: 17, fontVariant: ['tabular-nums'] },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  pagerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pagerLabel: { ...Type.subhead, fontFamily: Fonts.numeral, fontVariant: ['tabular-nums'] },
  disabled: { opacity: 0.3 },
});
