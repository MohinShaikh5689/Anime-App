import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, type ListRenderItem, Platform, StyleSheet, Text, View } from 'react-native';

import { ActionButton, Segmented } from '@/components/controls';
import { GenreTiles } from '@/components/genre-tiles';
import { PosterCard, PosterSkeleton } from '@/components/poster-card';
import { SectionHeader } from '@/components/shelf';
import { EmptyState, ErrorState } from '@/components/states';
import { type AnimeSummary, type BrowseOptions, browsePage, type MediaKind, mediaLabel } from '@/lib/anilist';
import { GRID_GAP, GRID_PADDING, useGrid } from '@/lib/use-grid';
import { useInfiniteList } from '@/lib/use-infinite-list';
import { useDebouncedValue } from '@/lib/use-request';
import { useUi } from '@/store/ui';
import { useAppTheme } from '@/theme/theme';
import { Type } from '@/theme/type';

const KINDS: MediaKind[] = ['anime', 'manga', 'manhwa'];
const KIND_LABELS = ['Anime', 'Manga', 'Manhwa'];

const PER_PAGE = 30;
const PADDING = GRID_PADDING;
const GAP = GRID_GAP;

/**
 * Poster grid. With no query it browses trending anime (or a picked genre);
 * otherwise it shows AniList search results.
 */
export function SearchResults({ query }: { query: string }) {
  const { colors } = useAppTheme();
  const { columns, cardWidth } = useGrid();
  const [genre, setGenre] = useState<string | null>(null);
  const kind = useUi((s) => s.searchKind);
  const setKind = useUi((s) => s.setSearchKind);
  const q = useDebouncedValue(query.trim(), 350);

  const options: BrowseOptions = q
    ? { kind, search: q }
    : genre
      ? { kind, genre, sort: 'POPULARITY_DESC' }
      : { kind, sort: 'TRENDING_DESC' };
  const key = `grid:${JSON.stringify(options)}`;
  const fetchPage = useCallback(
    (page: number, signal: AbortSignal) => browsePage({ ...options, perPage: PER_PAGE }, page, signal),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );
  const { items, loading, loadingMore, error, moreError, hasNext, loadMore, retry } = useInfiniteList(key, fetchPage);
  const data = items;

  const renderItem = useCallback<ListRenderItem<AnimeSummary>>(
    ({ item }) => (
      <PosterCard anime={item} width={cardWidth} subtitle={[mediaLabel(item), item.year].filter(Boolean).join(' · ')} />
    ),
    [cardWidth]
  );

  const heading = q ? 'Results' : genre ? `Popular in ${genre}` : `Trending ${KIND_LABELS[KINDS.indexOf(kind)].toLowerCase()}`;

  const header = (
    <View style={styles.header}>
      <Segmented values={KIND_LABELS} selectedIndex={KINDS.indexOf(kind)} onChange={(i) => setKind(KINDS[i] ?? 'anime')} />
      {!q && !genre ? (
        <>
          <SectionHeader title="Browse by genre" />
          <GenreTiles onPick={setGenre} />
        </>
      ) : null}
      {!q && genre ? (
        <View style={styles.chips}>
          <ActionButton title={genre} sf="xmark" md="close" variant="tonal" onPress={() => setGenre(null)} />
        </View>
      ) : null}
      {data.length || loading ? <SectionHeader title={heading} /> : null}
    </View>
  );

  let empty: React.ReactElement | null = null;
  if (loading) {
    empty = (
      <View style={styles.skeletonGrid}>
        {Array.from({ length: columns * 3 }, (_, i) => (
          <PosterSkeleton key={i} width={cardWidth} />
        ))}
      </View>
    );
  } else if (error) {
    empty = <ErrorState error={error} onRetry={retry} />;
  } else if (q) {
    empty = (
      <EmptyState
        sf="magnifyingglass"
        md="search_off"
        title="No results"
        body={`No ${KIND_LABELS[KINDS.indexOf(kind)].toLowerCase()} matches “${q}”. Try ${KIND_LABELS.filter((_, i) => KINDS[i] !== kind).join(' or ')} above.`}
      />
    );
  }

  // Under the last row: the next page loading, a retry if it failed, or the end.
  let footer: React.ReactElement | null = null;
  if (loadingMore) {
    footer = (
      <View style={styles.footer}>
        <ActivityIndicator />
      </View>
    );
  } else if (moreError) {
    footer = (
      <View style={styles.footer}>
        <Text style={[Type.footnote, { color: colors.textSecondary }]}>Couldn’t load more.</Text>
        <ActionButton title="Try Again" sf="arrow.clockwise" md="refresh" variant="tonal" onPress={retry} />
      </View>
    );
  } else if (data.length > 0 && !hasNext) {
    footer = (
      <View style={styles.footer}>
        <Text style={[Type.footnote, { color: colors.textSecondary }]}>That’s everything</Text>
      </View>
    );
  }

  return (
    <FlatList<AnimeSummary>
      key={columns}
      style={{ backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
      columnWrapperStyle={styles.columns}
      numColumns={columns}
      data={data}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={footer}
      // Ask for the next page about a screen and a half before the end, so scrolling
      // rarely reaches the spinner. Covers load lazily as rows mount (expo-image).
      onEndReached={loadMore}
      onEndReachedThreshold={1.5}
      // Keep the mounted window small: a few screens of rows, rendered in small batches.
      initialNumToRender={columns * 4}
      maxToRenderPerBatch={columns * 4}
      updateCellsBatchingPeriod={40}
      windowSize={9}
      removeClippedSubviews={Platform.OS === 'android'}
    />
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingBottom: 32, gap: 20 },
  columns: { gap: GAP, paddingHorizontal: PADDING },
  header: { gap: 18, paddingTop: 8 },
  chips: { flexDirection: 'row', paddingHorizontal: PADDING },
  footer: { alignItems: 'center', gap: 10, paddingVertical: 16 },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    rowGap: 20,
    paddingHorizontal: PADDING,
  },
});
