import { type Href, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { ActionSheetIOS, Alert, FlatList, Platform, StyleSheet, Text, View } from 'react-native';

import { IncrementButton, ListSwitcher } from '@/components/controls';
import { PosterCard } from '@/components/poster-card';
import { EmptyState } from '@/components/states';
import { LIST_STATUSES, LISTS } from '@/constants/lists';
import { GRID_GAP, GRID_PADDING, useGrid } from '@/lib/use-grid';
import { type LibraryEntry, useLibrary } from '@/store/library';
import { useUi } from '@/store/ui';
import { useAppTheme } from '@/theme/theme';
import { Type } from '@/theme/type';

function subtitleFor(e: LibraryEntry) {
  switch (e.status) {
    case 'watching':
      return `Episode ${e.progress}${e.episodes ? ` of ${e.episodes}` : ''}`;
    case 'wishlist':
      return e.episodes ? `${e.episodes} episodes` : 'Not started';
    case 'watched':
      return e.rating ? `Your rating ${e.rating}/5` : 'Not rated yet';
    case 'dropped':
      return e.progress ? `Stopped at ep ${e.progress}` : 'Dropped';
  }
}

/** Long-press menu: move a show to another list or remove it. */
function showQuickActions(entry: LibraryEntry) {
  const { setStatus, remove } = useLibrary.getState();
  const targets = LIST_STATUSES.filter((s) => s !== entry.status);
  const run = (index: number) => {
    if (index < targets.length) setStatus(entry, targets[index]);
    else if (index === targets.length) remove(entry.id);
  };
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: entry.title,
        options: [...targets.map((s) => `Move to ${LISTS[s].title}`), 'Remove from Library', 'Cancel'],
        destructiveButtonIndex: targets.length,
        cancelButtonIndex: targets.length + 1,
      },
      run
    );
  } else {
    Alert.alert(entry.title, undefined, [
      ...targets.map((s, i) => ({ text: `Move to ${LISTS[s].title}`, onPress: () => run(i) })),
      { text: 'Remove', style: 'destructive' as const, onPress: () => run(targets.length) },
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }
}

export function LibraryScreen() {
  const { colors } = useAppTheme();
  const { columns, cardWidth } = useGrid();
  const status = useUi((s) => s.libraryList);
  const setStatus = useUi((s) => s.setLibraryList);
  const entries = useLibrary((s) => s.entries);
  const hydrated = useLibrary((s) => s.hydrated);
  const increment = useLibrary((s) => s.incrementProgress);
  const meta = LISTS[status];

  const items = useMemo(
    () =>
      Object.values(entries)
        .filter((e) => e.status === status)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [entries, status]
  );

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <FlatList<LibraryEntry>
        key={columns}
        style={styles.fill}
        numColumns={columns}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        columnWrapperStyle={styles.columns}
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => {
          const finished = item.episodes != null && item.progress >= item.episodes;
          return (
            <View>
              <PosterCard
                anime={item}
                width={cardWidth}
                subtitle={subtitleFor(item)}
                frames={
                  item.status === 'watching' || item.status === 'dropped'
                    ? { progress: item.progress, total: item.episodes }
                    : undefined
                }
                onLongPress={() => showQuickActions(item)}
                accessory={
                  item.status === 'watching' && !finished ? (
                    <IncrementButton
                      floating
                      onPress={() => increment(item.id)}
                      accessibilityLabel={`Mark episode ${item.progress + 1} of ${item.title} as watched`}
                    />
                  ) : null
                }
              />
            </View>
          );
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            <ListSwitcher value={status} onChange={setStatus} />
            {items.length > 0 ? (
              <Text style={[styles.count, { color: colors.textSecondary }]}>
                {items.length} {items.length === 1 ? 'show' : 'shows'} · Touch and hold a cover to move it
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
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingBottom: 32, gap: 22 },
  columns: { gap: GRID_GAP, paddingHorizontal: GRID_PADDING },
  header: { paddingTop: 8, gap: 12 },
  count: { ...Type.footnote, marginHorizontal: 20 },
});
