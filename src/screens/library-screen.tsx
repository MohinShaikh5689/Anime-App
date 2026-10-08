import { type Href, router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { EntryRow } from '@/components/anime-rows';
import { ListSwitcher } from '@/components/controls';
import { AmbientBackdrop } from '@/components/motion';
import { EmptyState } from '@/components/states';
import { LISTS } from '@/constants/lists';
import { type LibraryEntry, useLibrary } from '@/store/library';
import { useUi } from '@/store/ui';
import { Fonts } from '@/theme/fonts';
import { useAppTheme } from '@/theme/theme';

const SWIPE_HINTS: Partial<Record<string, string>> = {
  watching: ' · swipe right for +1, left to finish',
  wishlist: ' · swipe right to start, left to finish',
};

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
        style={styles.fill}
        itemLayoutAnimation={LinearTransition.springify().damping(18)}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Animated.View entering={FadeIn.duration(350)} exiting={FadeOut.duration(220)}>
            <EntryRow entry={item} />
          </Animated.View>
        )}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          <View style={styles.header}>
            <ListSwitcher value={status} onChange={setStatus} />
            {items.length > 0 ? (
              <Text style={[styles.count, { color: colors.textSecondary }]}>
                {items.length} {items.length === 1 ? 'title' : 'titles'}
                {SWIPE_HINTS[status] ?? ''}
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

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingBottom: 24 },
  header: { paddingTop: 8, paddingBottom: 12, gap: 12 },
  fill: { flex: 1 },
  count: { fontFamily: Fonts.label, fontSize: 13, marginHorizontal: 20 },
  separator: { height: 10 },
});
