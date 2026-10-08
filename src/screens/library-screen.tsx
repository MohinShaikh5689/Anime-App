import { type Href, router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { EntryRow } from '@/components/anime-rows';
import { EmptyState } from '@/components/states';
import { type ListStatus, LISTS } from '@/constants/lists';
import { type LibraryEntry, useLibrary } from '@/store/library';
import { useAppTheme } from '@/theme/theme';

export function LibraryScreen({ status }: { status: ListStatus }) {
  const { colors } = useAppTheme();
  const entries = useLibrary((s) => s.entries);
  const hydrated = useLibrary((s) => s.hydrated);
  const meta = LISTS[status];

  const items = useMemo(
    () =>
      Object.values(entries)
        .filter((e) => e.status === status)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [entries, status]
  );

  return (
    <FlatList<LibraryEntry>
      style={{ backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <EntryRow entry={item} />}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={
        items.length > 0 ? (
          <Text style={[styles.count, { color: colors.textSecondary }]}>
            {items.length} {items.length === 1 ? 'title' : 'titles'}
          </Text>
        ) : null
      }
      ListEmptyComponent={
        hydrated ? (
          <EmptyState
            sf={meta.sf}
            md={meta.md}
            title={meta.emptyTitle}
            body={meta.emptyBody}
            action={{
              title: 'Find Anime',
              sf: 'magnifyingglass',
              md: 'search',
              onPress: () => router.navigate('/(search)' as Href),
            }}
          />
        ) : null
      }
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingBottom: 24 },
  count: { fontSize: 13, marginHorizontal: 20, marginTop: 8, marginBottom: 8 },
  separator: { height: 10 },
});
