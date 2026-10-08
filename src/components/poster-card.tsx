import { Link } from 'expo-router';
import { memo, useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/motion';
import { Poster } from '@/components/poster';
import { useAnimeHref } from '@/components/tab-context';
import { LISTS } from '@/constants/lists';
import type { AnimeSummary } from '@/lib/anilist';
import { useEntry } from '@/store/library';
import { Fonts } from '@/theme/fonts';
import { useAppTheme } from '@/theme/theme';

const RADIUS = Platform.OS === 'ios' ? 10 : 12;

type Props = {
  anime: AnimeSummary;
  width: number;
  subtitle?: string | null;
  /** 0–1 progress drawn along the bottom edge of the cover. */
  progress?: number | null;
  /** Rendered over the bottom-right corner of the cover (e.g. a +1 button). */
  accessory?: React.ReactNode;
  onLongPress?: () => void;
};

/** Cover-first card used in grids and horizontal shelves. */
export const PosterCard = memo(function PosterCard({
  anime,
  width,
  subtitle,
  progress,
  accessory,
  onLongPress,
}: Props) {
  const { colors } = useAppTheme();
  const href = useAnimeHref();
  const entry = useEntry(anime.id);
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;

  return (
    <View style={{ width }}>
      <Link href={href(anime.id)} asChild>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={anime.title}
          scaleTo={0.95}
          onLongPress={onLongPress}
          delayLongPress={350}
          style={styles.coverWrap}>
          <Poster uri={anime.coverUrl} color={anime.coverColor} width={width} style={styles.cover} />

          {score ? (
            <View style={[styles.badge, styles.score]}>
              <Text style={styles.badgeText}>★ {score}</Text>
            </View>
          ) : null}

          {entry ? (
            <View
              style={[styles.status, { backgroundColor: colors.status[entry.status] }]}
              accessibilityLabel={`In ${LISTS[entry.status].title}`}>
              <Icon sf={LISTS[entry.status].sfSelected} md={LISTS[entry.status].md} size={14} color="#FFFFFF" />
            </View>
          ) : null}

          {progress != null ? (
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${Math.min(1, progress) * 100}%`, backgroundColor: colors.primary },
                ]}
              />
            </View>
          ) : null}
        </PressableScale>
      </Link>
      {accessory ? (
        <View style={[styles.accessory, { top: width * 1.5 - 48 }]}>{accessory}</View>
      ) : null}

      <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
        {anime.title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
});

/** Placeholder with the same footprint as a PosterCard. */
export function PosterSkeleton({ width }: { width: number }) {
  const { colors } = useAppTheme();
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [pulse]);
  const animated = useAnimatedStyle(() => ({ opacity: 0.55 + pulse.value * 0.45 }));
  return (
    <Animated.View style={[{ width }, animated]}>
      <View
        style={[styles.cover, { width, height: width * 1.5, backgroundColor: colors.fill }]}
      />
      <View style={[styles.skeletonLine, { width: width * 0.85, backgroundColor: colors.fill }]} />
      <View style={[styles.skeletonLine, { width: width * 0.5, backgroundColor: colors.fill }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  coverWrap: { borderRadius: RADIUS, overflow: 'hidden' },
  cover: { borderRadius: RADIUS },
  badge: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  score: { top: 6, left: 6 },
  badgeText: { color: '#FFFFFF', fontFamily: Fonts.display, fontSize: 11, fontVariant: ['tabular-nums'] },
  status: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  progressBar: { height: '100%' },
  accessory: { position: 'absolute', right: 4 },
  title: { fontFamily: Fonts.heading, fontSize: 13.5, marginTop: 8, lineHeight: 17 },
  subtitle: { fontFamily: Fonts.label, fontSize: 12, marginTop: 2 },
  skeletonLine: { height: 10, borderRadius: 5, marginTop: 8 },
});
