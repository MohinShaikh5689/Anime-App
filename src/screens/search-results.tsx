import { useCallback, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/controls';
import { PosterCard, PosterSkeleton } from '@/components/poster-card';
import { SectionHeader } from '@/components/shelf';
import { EmptyState, ErrorState } from '@/components/states';
import { type AnimeSummary, type BrowseOptions, GENRES, browseAnime, formatLabel } from '@/lib/anilist';
import { GRID_GAP, GRID_PADDING, useGrid } from '@/lib/use-grid';
import { useDebouncedValue, useRequest } from '@/lib/use-request';
import { useAppTheme } from '@/theme/theme';

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
  const q = useDebouncedValue(query.trim(), 350);

  const options: BrowseOptions = q
    ? { search: q }
    : genre
      ? { genre, sort: 'POPULARITY_DESC' }
      : { sort: 'TRENDING_DESC' };
  const key = `grid:${JSON.stringify(options)}`;
  const fetcher = useCallback(
    (signal: AbortSignal) => browseAnime({ ...options, perPage: 30 }, signal),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );
  const { data, error, loading, retry } = useRequest(key, fetcher);

  const heading = q ? 'Results' : genre ? `Popular in ${genre}` : 'Trending now';

  const header = (
    <View style={styles.header}>
      {!q ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}>
          <Chip label="Trending" selected={genre === null} onPress={() => setGenre(null)} />
          {GENRES.map((g) => (
            <Chip
              key={g}
              label={g}
              selected={genre === g}
              onPress={() => setGenre(genre === g ? null : g)}
            />
          ))}
        </ScrollView>
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
          subtitle={[formatLabel(item.format), item.year].filter(Boolean).join(' · ')}
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
  header: { gap: 16, paddingTop: 8 },
  chips: { gap: 8, paddingHorizontal: PADDING },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    rowGap: 20,
    paddingHorizontal: PADDING,
  },
});
