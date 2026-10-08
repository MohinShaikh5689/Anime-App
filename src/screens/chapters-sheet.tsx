import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { ChapterRow, chapterCount, ReleaseBanner, useChapters } from '@/components/chapters';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { type ChapterData, type ChapterTarget, loadOlderChapters } from '@/lib/chapters';
import { showAccent } from '@/lib/color';
import { useEntry, useLibrary } from '@/store/library';
import { Fonts } from '@/theme/fonts';
import { useAppTheme } from '@/theme/theme';
import { Type } from '@/theme/type';

type Props = {
  target: ChapterTarget;
  title: string;
  total: number | null;
  color: string | null;
};

/** Every chapter of a series, newest first, with release dates; presented as a sheet. */
export function ChaptersSheet({ target, title, total, color }: Props) {
  const { colors } = useAppTheme();
  const entry = useEntry(target.id);
  const accent = showAccent(color, colors.primary);
  const { data: first, error, loading, retry } = useChapters(target);
  const [older, setOlder] = useState<ChapterData | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const busy = useRef(false);

  const data = older ?? first ?? null;
  const count = chapterCount(data, total, entry?.progress);
  const progress = entry?.progress ?? 0;
  const numbers = Array.from({ length: count }, (_, i) => count - i);

  // Release dates come in pages; keep loading while the list reaches undated chapters.
  const loadMore = useCallback(async () => {
    if (!data?.hasMore || busy.current) return;
    busy.current = true;
    setLoadingMore(true);
    try {
      setOlder(await loadOlderChapters(data, target.finished));
    } catch {
      // Older dates are a nice-to-have; the chapter list still works without them.
    } finally {
      busy.current = false;
      setLoadingMore(false);
    }
  }, [data, target.finished]);

  const onPress = entry
    ? (n: number) => useLibrary.getState().setProgress(target.id, n === progress ? n - 1 : n)
    : undefined;

  if (!data && loading) return <LoadingState />;
  if (!data && error) return <ErrorState error={error} onRetry={retry} />;

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      data={numbers}
      keyExtractor={(n) => String(n)}
      initialNumToRender={20}
      onEndReachedThreshold={0.6}
      onEndReached={loadMore}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {title}
          </Text>
          <Text style={[Type.subhead, { color: colors.textSecondary }]}>
            {count} chapters{entry ? ` · ${progress} read` : ''}
          </Text>
          {data ? <ReleaseBanner data={data} accent={accent} /> : null}
          {!entry && count > 0 ? (
            <Text style={[Type.footnote, { color: colors.textSecondary }]}>
              Add this series to your library to mark chapters as read.
            </Text>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          sf="book.closed"
          md="menu_book"
          title="No chapter info"
          body="Release dates for this series aren't available yet."
        />
      }
      ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footer} /> : null}
      renderItem={({ item: n }) => (
        <ChapterRow number={n} releasedAt={data?.dates[n]} read={n <= progress} accent={accent} onPress={onPress} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 48, flexGrow: 1 },
  header: { gap: 10, paddingBottom: 12 },
  title: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 34 },
  footer: { marginVertical: 20 },
});
