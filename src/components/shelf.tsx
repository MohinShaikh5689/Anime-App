import { type PropsWithChildren, useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { PosterCard, PosterSkeleton } from '@/components/poster-card';
import { type AnimeSummary, type BrowseOptions, browseAnime, formatLabel } from '@/lib/anilist';
import { useRequest } from '@/lib/use-request';
import { useAppTheme } from '@/theme/theme';
import { Type } from '@/theme/type';

const CARD_WIDTH = 124;
const GAP = 14;

type Action = { label: string; onPress: () => void };

/** Section heading on a sheet rule: title left, optional action right. */
export function SectionHeader({ title, action }: { title: string; action?: Action }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.header, { borderBottomColor: colors.rule as string }]}>
      <Text style={[Type.title3, { color: colors.text }]} accessibilityRole="header">
        {title}
      </Text>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={12} accessibilityRole="button">
          <Text style={[Type.subhead, { color: colors.primary }]}>{action.label}</Text>
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
};

export function PosterRow<T>({ data, renderCard, keyOf, width = CARD_WIDTH }: PosterRowProps<T>) {
  return (
    <FlatList
      horizontal
      data={data}
      keyExtractor={(item) => String(keyOf(item))}
      renderItem={({ item, index }) => renderCard(item, width, index)}
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
          renderCard={(a, w, i) => (
            <PosterCard
              anime={a}
              width={w}
              rank={ranked ? i + 1 : undefined}
              subtitle={[formatLabel(a.format), a.averageScore ? `${(a.averageScore / 10).toFixed(1)}/10` : null]
                .filter(Boolean)
                .join(' · ')}
            />
          )}
        />
      ) : error ? (
        <Pressable onPress={retry} style={styles.error} accessibilityRole="button">
          <Text style={[Type.subhead, { color: colors.textSecondary }]}>
            Couldn&apos;t load this shelf. <Text style={{ color: colors.primary }}>Try again</Text>
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

function RowGap() {
  return <View style={{ width: GAP }} />;
}

const styles = StyleSheet.create({
  shelf: { gap: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  row: { paddingHorizontal: 20 },
  skeletons: { flexDirection: 'row', gap: GAP, overflow: 'hidden' },
  error: { paddingHorizontal: 20, paddingVertical: 24 },
});
