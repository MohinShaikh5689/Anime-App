import { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { SearchRow } from '@/components/anime-rows';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { type AnimeSummary, searchAnime, trendingAnime } from '@/lib/anilist';
import { useDebouncedValue, useRequest } from '@/lib/use-request';
import { useAppTheme } from '@/theme/theme';

/** Trending anime when the query is empty, otherwise AniList search results. */
export function SearchResults({ query }: { query: string }) {
  const { colors } = useAppTheme();
  const q = useDebouncedValue(query.trim(), 350);
  const fetcher = useCallback(
    (signal: AbortSignal) => (q ? searchAnime(q, signal) : trendingAnime(signal)),
    [q]
  );
  const { data, error, loading, retry } = useRequest(q ? `search:${q.toLowerCase()}` : 'trending', fetcher);

  let empty: React.ReactElement | null = null;
  if (loading) empty = <LoadingState />;
  else if (error) empty = <ErrorState error={error} onRetry={retry} />;
  else if (q)
    empty = (
      <EmptyState
        sf="magnifyingglass"
        md="search_off"
        title="No results"
        body={`Nothing on AniList matches “${q}”.`}
      />
    );

  return (
    <FlatList<AnimeSummary>
      style={{ backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
      data={data ?? []}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <SearchRow anime={item} />}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={
        data?.length ? (
          <Text style={[styles.heading, { color: colors.text }]}>
            {q ? 'Results' : 'Trending Now'}
          </Text>
        ) : null
      }
      ListEmptyComponent={empty}
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingBottom: 24 },
  heading: { fontSize: 20, fontWeight: '700', marginHorizontal: 20, marginTop: 8, marginBottom: 10 },
  separator: { height: 10 },
});
