import { type Href, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { ActionSheetIOS, Alert, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { IncrementButton, ListSwitcher } from '@/components/controls';
import { AmbientBackdrop } from '@/components/motion';
import { PosterCard } from '@/components/poster-card';
import { EmptyState } from '@/components/states';
import { LIST_STATUSES, LISTS } from '@/constants/lists';
import { GRID_GAP, GRID_PADDING, useGrid } from '@/lib/use-grid';
import { type LibraryEntry, useLibrary } from '@/store/library';
import { useUi } from '@/store/ui';
import { Fonts } from '@/theme/fonts';
import { useAppTheme } from '@/theme/theme';

function subtitleFor(e: LibraryEntry) {
  switch (e.status) {
    case 'watching':
      return `Ep ${e.progress}${e.episodes ? ` of ${e.episodes}` : ''}`;
    case 'wishlist':
      return e.episodes ? `${e.episodes} episodes` : 'Not started';
    case 'watched':
      return e.rating ? '★'.repeat(e.rating) + '☆'.repeat(5 - e.rating) : 'Tap to rate';
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

  const featured = items[0];

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <AmbientBackdrop
        key={`${status}:${featured?.id ?? 'none'}`}
        uri={featured?.coverUrl}
        color={featured?.coverColor}
        height={380}
      />
      <Animated.FlatList<LibraryEntry>
        key={columns}
        style={styles.fill}
        numColumns={columns}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        columnWrapperStyle={styles.columns}
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => {
          const finished = item.episodes != null && item.progress >= item.episodes;
          return (
            <Animated.View
              entering={FadeIn.delay((index % (columns * 4)) * 35).duration(380)}
              exiting={FadeOut.duration(200)}>
              <PosterCard
                anime={item}
                width={cardWidth}
                subtitle={subtitleFor(item)}
                progress={
                  item.status === 'watching' && item.episodes ? item.progress / item.episodes : null
                }
                onLongPress={() => showQuickActions(item)}
                accessory={
                  item.status === 'watching' && !finished ? (
                    <IncrementButton
                      value={item.progress}
                      onPress={() => increment(item.id)}
                      accessibilityLabel={`Mark episode ${item.progress + 1} of ${item.title} as watched`}
                    />
                  ) : null
                }
              />
            </Animated.View>
          );
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            <ListSwitcher value={status} onChange={setStatus} />
            {items.length > 0 ? (
              <Text style={[styles.count, { color: colors.textSecondary }]}>
                {items.length} {items.length === 1 ? 'title' : 'titles'} · long-press a cover for options
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
  content: { flexGrow: 1, paddingBottom: 32, gap: 20 },
  columns: { gap: GRID_GAP, paddingHorizontal: GRID_PADDING },
  header: { paddingTop: 8, gap: 12 },
  count: { fontFamily: Fonts.label, fontSize: 13, marginHorizontal: 20 },
});
