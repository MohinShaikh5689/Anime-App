import { Link } from 'expo-router';
import { memo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Poster } from '@/components/poster';
import { useAnimeHref } from '@/components/tab-context';
import { LISTS } from '@/constants/lists';
import type { AnimeSummary } from '@/lib/anilist';
import { useEntry } from '@/store/library';
import { useAppTheme } from '@/theme/theme';

const isIOS = Platform.OS === 'ios';
const RADIUS = isIOS ? 10 : 12;

type Props = {
  anime: AnimeSummary;
  width: number;
  subtitle?: string | null;
  /** 0–1 progress drawn along the bottom edge of the cover. */
  progress?: number | null;
  /** Rendered over the bottom-right corner of the cover (e.g. a +1 button). */
  accessory?: React.ReactNode;
};

/** Cover-first card used in grids and horizontal shelves. */
export const PosterCard = memo(function PosterCard({
  anime,
  width,
  subtitle,
  progress,
  accessory,
}: Props) {
  const { colors } = useAppTheme();
  const href = useAnimeHref();
  const entry = useEntry(anime.id);
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;

  return (
    <View style={{ width }}>
      <Link href={href(anime.id)} asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={anime.title}
          android_ripple={{ color: 'rgba(255,255,255,0.2)', foreground: true }}
          style={({ pressed }) => [
            styles.coverWrap,
            isIOS && pressed && { transform: [{ scale: 0.97 }], opacity: 0.85 },
          ]}>
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
        </Pressable>
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
  return (
    <View style={{ width }}>
      <View
        style={[styles.cover, { width, height: width * 1.5, backgroundColor: colors.fill }]}
      />
      <View style={[styles.skeletonLine, { width: width * 0.85, backgroundColor: colors.fill }]} />
      <View style={[styles.skeletonLine, { width: width * 0.5, backgroundColor: colors.fill }]} />
    </View>
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
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
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
  title: { fontSize: 13, fontWeight: '600', marginTop: 6, lineHeight: 17 },
  subtitle: { fontSize: 12, marginTop: 2 },
  skeletonLine: { height: 10, borderRadius: 5, marginTop: 8 },
});
