import { Link } from 'expo-router';
import { memo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { FrameStrip } from '@/components/frames';
import { Icon } from '@/components/icon';
import { PlatformPressable } from '@/components/motion';
import { Poster } from '@/components/poster';
import { useAnimeHref } from '@/components/tab-context';
import { LISTS } from '@/constants/lists';
import type { AnimeSummary } from '@/lib/anilist';
import { useEntry } from '@/store/library';
import { Fonts } from '@/theme/fonts';
import { useAppTheme } from '@/theme/theme';
import { Type } from '@/theme/type';

const RADIUS = Platform.OS === 'ios' ? 8 : 12;

type Props = {
  anime: AnimeSummary;
  width: number;
  subtitle?: string | null;
  /** Rank in a ranked shelf, set as a sheet numeral before the title. */
  rank?: number;
  /** Episode progress, drawn as a frame strip under the cover. */
  frames?: { progress: number; total: number | null };
  /** Rendered over the bottom-right corner of the cover (e.g. a +1 button). */
  accessory?: React.ReactNode;
  onLongPress?: () => void;
};

/** Cover-first card for grids and shelves. The cover is the only colour on it. */
export const PosterCard = memo(function PosterCard({
  anime,
  width,
  subtitle,
  rank,
  frames,
  accessory,
  onLongPress,
}: Props) {
  const { colors } = useAppTheme();
  const href = useAnimeHref();
  const entry = useEntry(anime.id);

  return (
    <View style={{ width }}>
      <Link href={href(anime.id)} asChild>
        <PlatformPressable
          accessibilityRole="button"
          accessibilityLabel={`${anime.title}${entry ? `, in ${LISTS[entry.status].title}` : ''}`}
          onLongPress={onLongPress}
          delayLongPress={350}
          style={[styles.coverWrap, { borderColor: colors.rule as string }]}>
          <Poster uri={anime.coverUrl} color={anime.coverColor} width={width} style={styles.cover} />
          {entry && !frames ? (
            <View style={[styles.mark, { backgroundColor: colors.ink as string }]}>
              <Icon sf={LISTS[entry.status].sfSelected} md={LISTS[entry.status].md} size={12} color={colors.background as string} />
            </View>
          ) : null}
        </PlatformPressable>
      </Link>
      {accessory ? <View style={[styles.accessory, { top: width * 1.5 - 46 }]}>{accessory}</View> : null}

      {frames ? (
        <View style={styles.frames}>
          <FrameStrip progress={frames.progress} total={frames.total} height={6} />
        </View>
      ) : null}
      <View style={styles.titleRow}>
        {rank != null ? (
          <Text style={[styles.rank, { color: colors.textSecondary }]}>{String(rank).padStart(2, '0')}</Text>
        ) : null}
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {anime.title}
        </Text>
      </View>
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
    <View style={{ width }} accessibilityLabel="Loading">
      <View style={[styles.cover, { width, height: width * 1.5, backgroundColor: colors.fill }]} />
      <View style={[styles.skeletonLine, { width: width * 0.85, backgroundColor: colors.fill }]} />
      <View style={[styles.skeletonLine, { width: width * 0.5, backgroundColor: colors.fill }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  coverWrap: { borderRadius: RADIUS, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  cover: { borderRadius: RADIUS },
  mark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessory: { position: 'absolute', right: 4 },
  frames: { marginTop: 8 },
  titleRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  rank: { fontFamily: Fonts.numeral, fontSize: 16, lineHeight: 19, fontVariant: ['tabular-nums'] },
  title: { ...Type.subhead, fontWeight: '600', flex: 1, lineHeight: Platform.OS === 'ios' ? 19 : 20 },
  subtitle: { ...Type.footnote, marginTop: 2 },
  skeletonLine: { height: 10, borderRadius: 5, marginTop: 8 },
});
