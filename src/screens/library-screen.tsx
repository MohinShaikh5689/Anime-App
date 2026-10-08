import { type Href, router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { EntryRow } from '@/components/anime-rows';
import { ListSwitcher } from '@/components/controls';
import { EmptyState } from '@/components/states';
import { LISTS } from '@/constants/lists';
import { type LibraryEntry, useLibrary } from '@/store/library';
import { useUi } from '@/store/ui';
import { useAppTheme } from '@/theme/theme';

export function LibraryScreen() {
  const { colors } = useAppTheme();
  const status = useUi((s) => s.libraryList);
  const setStatus = useUi((s) => s.setLibraryList);
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
        <View style={styles.header}>
          <ListSwitcher value={status} onChange={setStatus} />
          {items.length > 0 ? (
            <Text style={[styles.count, { color: colors.textSecondary }]}>
              {items.length} {items.length === 1 ? 'title' : 'titles'}
            </Text>
          ) : null}
        </View>
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
  header: { paddingTop: 8, paddingBottom: 12, gap: 12 },
  count: { fontSize: 13, marginHorizontal: 20 },
  separator: { height: 10 },
});
