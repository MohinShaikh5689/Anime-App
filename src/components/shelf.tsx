import { type PropsWithChildren, useCallback } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { PosterCard, PosterSkeleton } from '@/components/poster-card';
import { type AnimeSummary, type BrowseOptions, browseAnime, describeAnime } from '@/lib/anilist';
import { useRequest } from '@/lib/use-request';
import { useAppTheme } from '@/theme/theme';

const CARD_WIDTH = 128;

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.header}>
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
        {title}
      </Text>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={8} accessibilityRole="button">
          <Text style={[styles.action, { color: colors.primary }]}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** A titled, horizontally scrolling row. */
export function Shelf({
  title,
  action,
  children,
}: PropsWithChildren<{ title: string; action?: { label: string; onPress: () => void } }>) {
  return (
    <View style={styles.shelf}>
      <SectionHeader title={title} action={action} />
      {children}
    </View>
  );
}

type PosterRowProps<T> = {
  data: T[];
  renderCard: (item: T, width: number) => React.ReactElement;
  keyOf: (item: T) => number;
  width?: number;
};

export function PosterRow<T>({ data, renderCard, keyOf, width = CARD_WIDTH }: PosterRowProps<T>) {
  return (
    <FlatList
      horizontal
      data={data}
      keyExtractor={(item) => String(keyOf(item))}
      renderItem={({ item }) => renderCard(item, width)}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      ItemSeparatorComponent={RowGap}
      decelerationRate="fast"
      snapToInterval={width + GAP}
      snapToAlignment="start"
    />
  );
}

/** Shelf backed by an AniList browse query, with skeletons while loading. */
export function RemoteShelf({
  title,
  query,
  action,
}: {
  title: string;
  query: BrowseOptions;
  action?: { label: string; onPress: () => void };
}) {
  const { colors } = useAppTheme();
  const key = `browse:${JSON.stringify(query)}`;
  const fetcher = useCallback(
    (signal: AbortSignal) => browseAnime({ perPage: 15, ...query }, signal),
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
          renderCard={(a, w) => <PosterCard anime={a} width={w} subtitle={describeAnime(a)} />}
        />
      ) : error ? (
        <Pressable onPress={retry} style={styles.error} accessibilityRole="button">
          <Text style={{ color: colors.textSecondary }}>
            Couldn&apos;t load. <Text style={{ color: colors.primary }}>Try again</Text>
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

const GAP = 12;

function RowGap() {
  return <View style={{ width: GAP }} />;
}

const styles = StyleSheet.create({
  shelf: { gap: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: Platform.select({ ios: 22, default: 20 }),
    fontWeight: Platform.select({ ios: '700', default: '500' }),
  },
  action: { fontSize: 15, fontWeight: '500' },
  row: { paddingHorizontal: 16 },
  skeletons: { flexDirection: 'row', gap: GAP, overflow: 'hidden' },
  error: { paddingHorizontal: 20, paddingVertical: 24 },
});
