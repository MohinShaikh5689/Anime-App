import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { ActionButton, Segmented } from '@/components/controls';
import { GenreTiles } from '@/components/genre-tiles';
import { PosterCard, PosterSkeleton } from '@/components/poster-card';
import { SectionHeader } from '@/components/shelf';
import { EmptyState, ErrorState } from '@/components/states';
import { type AnimeSummary, type BrowseOptions, browseAnime, type MediaKind, mediaLabel } from '@/lib/anilist';
import { GRID_GAP, GRID_PADDING, useGrid } from '@/lib/use-grid';
import { useDebouncedValue, useRequest } from '@/lib/use-request';
import { useUi } from '@/store/ui';
import { useAppTheme } from '@/theme/theme';

const KINDS: MediaKind[] = ['anime', 'manga', 'manhwa'];
const KIND_LABELS = ['Anime', 'Manga', 'Manhwa'];

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
  const fetcher = useCallback(
    (signal: AbortSignal) => browseAnime({ ...options, perPage: 30 }, signal),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );
  const { data, error, loading, retry } = useRequest(key, fetcher);

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
      {data?.length || loading ? <SectionHeader title={heading} /> : null}
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
        body={`Nothing on AniList matches “${q}”.`}
      />
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
      data={data ?? []}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <PosterCard
          anime={item}
          width={cardWidth}
          subtitle={[mediaLabel(item), item.year].filter(Boolean).join(' · ')}
        />
      )}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
    />
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingBottom: 32, gap: 20 },
  columns: { gap: GAP, paddingHorizontal: PADDING },
  header: { gap: 18, paddingTop: 8 },
  chips: { flexDirection: 'row', paddingHorizontal: PADDING },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    rowGap: 20,
    paddingHorizontal: PADDING,
  },
});
