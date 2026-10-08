import { Link } from 'expo-router';
import { memo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { PlatformPressable } from '@/components/motion';
import { Poster } from '@/components/poster';
import { EpisodeBar } from '@/components/progress';
import { useAnimeHref } from '@/components/tab-context';
import { LISTS } from '@/constants/lists';
import type { AnimeSummary } from '@/lib/anilist';
import { showAccent } from '@/lib/color';
import { useEntry } from '@/store/library';
import { Fonts } from '@/theme/fonts';
import { useAppTheme } from '@/theme/theme';
import { Type } from '@/theme/type';

const RADIUS = Platform.OS === 'ios' ? 12 : 14;

type Props = {
  anime: AnimeSummary;
  width: number;
  subtitle?: string | null;
  /** Episode progress, drawn as a bar in the show's colour under the cover. */
  frames?: { progress: number; total: number | null };
  /** Rendered over the bottom-right corner of the cover (e.g. a +1 button). */
  accessory?: React.ReactNode;
  onLongPress?: () => void;
};

/** Cover-first card for grids and shelves. */
export const PosterCard = memo(function PosterCard({ anime, width, subtitle, frames, accessory, onLongPress }: Props) {
  const { colors } = useAppTheme();
  const href = useAnimeHref();
  const entry = useEntry(anime.id);
  const accent = showAccent(anime.coverColor, colors.primary as string);

  return (
    <View style={{ width }}>
      <Link href={href(anime.id)} asChild>
        <PlatformPressable
          accessibilityRole="button"
          accessibilityLabel={`${anime.title}${entry ? `, in ${LISTS[entry.status].title}` : ''}`}
          onLongPress={onLongPress}
          delayLongPress={350}
          style={[styles.coverWrap, { boxShadow: `0 10px 24px ${accent}38` }]}>
          <Poster uri={anime.coverUrl} color={anime.coverColor} width={width} />
          {entry && !frames ? (
            <View style={styles.mark}>
              <Icon sf={LISTS[entry.status].sfSelected} md={LISTS[entry.status].md} size={13} color="#FFFFFF" />
            </View>
          ) : null}
        </PlatformPressable>
      </Link>
      {accessory ? <View style={[styles.accessory, { top: width * 1.5 - 50 }]}>{accessory}</View> : null}

      {frames ? (
        <View style={styles.frames}>
          <EpisodeBar progress={frames.progress} total={frames.total} color={accent} height={4} />
        </View>
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

/** Netflix-style ranked tile: a huge rank numeral tucked behind the poster. */
export const RankedCard = memo(function RankedCard({ anime, rank, width }: { anime: AnimeSummary; rank: number; width: number }) {
  const { colors } = useAppTheme();
  const href = useAnimeHref();
  return (
    <Link href={href(anime.id)} asChild>
      <PlatformPressable accessibilityRole="button" accessibilityLabel={`Number ${rank}, ${anime.title}`} style={styles.ranked}>
        <Text
          style={[styles.rankNumber, { color: colors.text, fontSize: width * 1.05, lineHeight: width * 1.1 }]}
          maxFontSizeMultiplier={1}
          importantForAccessibility="no">
          {rank}
        </Text>
        <View style={{ marginLeft: rank >= 10 ? -width * 0.3 : -width * 0.18 }}>
          <Poster uri={anime.coverUrl} color={anime.coverColor} width={width} />
        </View>
      </PlatformPressable>
    </Link>
  );
});

/** Placeholder with the same footprint as a PosterCard. */
export function PosterSkeleton({ width }: { width: number }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ width }} accessibilityLabel="Loading">
      <View style={[styles.skeletonCover, { width, height: width * 1.5, backgroundColor: colors.fill }]} />
      <View style={[styles.skeletonLine, { width: width * 0.85, backgroundColor: colors.fill }]} />
      <View style={[styles.skeletonLine, { width: width * 0.5, backgroundColor: colors.fill }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  coverWrap: { borderRadius: RADIUS, borderCurve: 'continuous' },
  mark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  accessory: { position: 'absolute', right: 6 },
  frames: { marginTop: 10 },
  title: { ...Type.subhead, fontWeight: '600', marginTop: 10, lineHeight: Platform.OS === 'ios' ? 19 : 20 },
  subtitle: { ...Type.footnote, marginTop: 2 },
  ranked: { flexDirection: 'row', alignItems: 'flex-end' },
  rankNumber: { fontFamily: Fonts.display, opacity: 0.9 },
  skeletonCover: { borderRadius: RADIUS },
  skeletonLine: { height: 10, borderRadius: 5, marginTop: 10 },
});
