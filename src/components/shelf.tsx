import { type PropsWithChildren, useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { PosterCard, PosterSkeleton, RankedCard } from '@/components/poster-card';
import { type AnimeSummary, type BrowseOptions, browseAnime, formatLabel } from '@/lib/anilist';
import { useRequest } from '@/lib/use-request';
import { Fonts } from '@/theme/fonts';
import { useAppTheme } from '@/theme/theme';
import { Type } from '@/theme/type';

const CARD_WIDTH = 140;
const GAP = 14;

type Action = { label: string; onPress: () => void };

/** Bold section title with an optional action on the right. */
export function SectionHeader({ title, action }: { title: string; action?: Action }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.header}>
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
        {title}
      </Text>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={12} accessibilityRole="button">
          <Text style={[Type.subhead, styles.action, { color: colors.primary }]}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Shelf({ title, action, children }: PropsWithChildren<{ title: string; action?: Action }>) {
  return (
    <View style={styles.shelf}>
      <SectionHeader title={title} action={action} />
      {children}
    </View>
  );
}

type PosterRowProps<T> = {
  data: T[];
  renderCard: (item: T, width: number, index: number) => React.ReactElement;
  keyOf: (item: T) => number;
  width?: number;
  gap?: number;
};

export function PosterRow<T>({ data, renderCard, keyOf, width = CARD_WIDTH, gap = GAP }: PosterRowProps<T>) {
  return (
    <FlatList
      horizontal
      data={data}
      keyExtractor={(item) => String(keyOf(item))}
      renderItem={({ item, index }) => renderCard(item, width, index)}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, { gap }]}
      decelerationRate="fast"
    />
  );
}

/** Shelf backed by an AniList browse query, with skeletons while loading. */
export function RemoteShelf({
  title,
  query,
  ranked,
  action,
}: {
  title: string;
  query: BrowseOptions;
  ranked?: boolean;
  action?: Action;
}) {
  const { colors } = useAppTheme();
  const key = `browse:${JSON.stringify(query)}`;
  const fetcher = useCallback(
    (signal: AbortSignal) => browseAnime({ perPage: ranked ? 10 : 15, ...query }, signal),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );
  const { data, error, retry } = useRequest(key, fetcher);

  return (
    <Shelf title={title} action={action}>
      {data ? (
        <PosterRow<AnimeSummary>
          data={data}
          keyOf={(a) => a.id}
          width={ranked ? 120 : CARD_WIDTH}
          gap={ranked ? 6 : GAP}
          renderCard={(a, w, i) =>
            ranked ? (
              <RankedCard anime={a} rank={i + 1} width={w} />
            ) : (
              <PosterCard
                anime={a}
                width={w}
                subtitle={[formatLabel(a.format), a.averageScore ? `${a.averageScore}%` : null]
                  .filter(Boolean)
                  .join(' · ')}
              />
            )
          }
        />
      ) : error ? (
        <Pressable onPress={retry} style={styles.error} accessibilityRole="button">
          <Text style={[Type.subhead, { color: colors.textSecondary }]}>
            Couldn&apos;t load this row. <Text style={{ color: colors.primary }}>Try again</Text>
          </Text>
        </Pressable>
      ) : (
        <View style={[styles.row, styles.skeletons]}>
          {[0, 1, 2, 3].map((i) => (
            <PosterSkeleton key={i} width={CARD_WIDTH} />
          ))}
        </View>
      )}
    </Shelf>
  );
}

const styles = StyleSheet.create({
  shelf: { gap: 14 },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginHorizontal: 20 },
  title: { fontFamily: Fonts.display, fontSize: 24, letterSpacing: -0.6 },
  action: { fontWeight: '600' },
  row: { paddingHorizontal: 20 },
  skeletons: { flexDirection: 'row', gap: GAP, overflow: 'hidden' },
  error: { paddingHorizontal: 20, paddingVertical: 24 },
});
