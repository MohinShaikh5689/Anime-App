import { type Href, router } from 'expo-router';
import { useMemo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton, IncrementButton } from '@/components/controls';
import { Icon } from '@/components/icon';
import { PosterCard } from '@/components/poster-card';
import { PosterRow, RemoteShelf, Shelf } from '@/components/shelf';
import { LIST_STATUSES, type ListStatus, LISTS } from '@/constants/lists';
import { currentSeason } from '@/lib/anilist';
import { type LibraryEntry, useLibrary } from '@/store/library';
import { useUi } from '@/store/ui';
import { useAppTheme } from '@/theme/theme';

const isIOS = Platform.OS === 'ios';
const SEASON = currentSeason();
const SEASON_LABEL = `${SEASON.season[0]}${SEASON.season.slice(1).toLowerCase()} ${SEASON.seasonYear}`;

function openLibrary(list: ListStatus) {
  useUi.getState().setLibraryList(list);
  router.navigate('/(library)' as Href);
}

function openSearch() {
  router.navigate('/(search)' as Href);
}

export function HomeScreen() {
  const { colors } = useAppTheme();
  const entries = useLibrary((s) => s.entries);
  const increment = useLibrary((s) => s.incrementProgress);

  const { byStatus, watching, upNext } = useMemo(() => {
    const all = Object.values(entries).sort((a, b) => b.updatedAt - a.updatedAt);
    const counts = Object.fromEntries(LIST_STATUSES.map((s) => [s, 0])) as Record<ListStatus, number>;
    for (const e of all) counts[e.status] += 1;
    return {
      byStatus: counts,
      watching: all.filter((e) => e.status === 'watching'),
      upNext: all.filter((e) => e.status === 'wishlist').reverse(),
    };
  }, [entries]);
  const isEmpty = Object.keys(entries).length === 0;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}>
      {isEmpty ? (
        <View style={[styles.welcome, { backgroundColor: colors.surface }]}>
          <Icon sf="sparkles.tv" md="live_tv" size={40} color={colors.primary} />
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>Start your anime library</Text>
          <Text style={[styles.welcomeBody, { color: colors.textSecondary }]}>
            Find shows you love, plan what to watch next and track every episode.
          </Text>
          <View style={styles.welcomeAction}>
            <ActionButton title="Find Anime" sf="magnifyingglass" md="search" variant="primary" onPress={openSearch} />
          </View>
        </View>
      ) : (
        <View style={styles.stats}>
          {LIST_STATUSES.map((status) => (
            <StatTile key={status} status={status} count={byStatus[status]} />
          ))}
        </View>
      )}

      {watching.length > 0 ? (
        <Shelf title="Continue Watching" action={{ label: 'See All', onPress: () => openLibrary('watching') }}>
          <PosterRow<LibraryEntry>
            data={watching}
            width={140}
            keyOf={(e) => e.id}
            renderCard={(e, w) => {
              const done = e.episodes != null && e.progress >= e.episodes;
              return (
                <PosterCard
                  anime={e}
                  width={w}
                  progress={e.episodes ? e.progress / e.episodes : null}
                  subtitle={`Episode ${e.progress}${e.episodes ? ` of ${e.episodes}` : ''}`}
                  accessory={
                    done ? null : (
                      <IncrementButton
                        onPress={() => increment(e.id)}
                        accessibilityLabel={`Mark episode ${e.progress + 1} of ${e.title} as watched`}
                      />
                    )
                  }
                />
              );
            }}
          />
        </Shelf>
      ) : null}

      {upNext.length > 0 ? (
        <Shelf title="Up Next" action={{ label: 'See All', onPress: () => openLibrary('wishlist') }}>
          <PosterRow<LibraryEntry>
            data={upNext}
            keyOf={(e) => e.id}
            renderCard={(e, w) => (
              <PosterCard
                anime={e}
                width={w}
                subtitle={e.episodes ? `${e.episodes} episodes` : null}
              />
            )}
          />
        </Shelf>
      ) : null}

      <RemoteShelf title="Trending Now" query={{ sort: 'TRENDING_DESC' }} />
      <RemoteShelf title={`Popular in ${SEASON_LABEL}`} query={{ ...SEASON, sort: 'POPULARITY_DESC' }} />
      <RemoteShelf title="Top Rated of All Time" query={{ sort: 'SCORE_DESC' }} />
    </ScrollView>
  );
}

function StatTile({ status, count }: { status: ListStatus; count: number }) {
  const { colors } = useAppTheme();
  const meta = LISTS[status];
  return (
    <Pressable
      onPress={() => openLibrary(status)}
      accessibilityRole="button"
      accessibilityLabel={`${count} in ${meta.title}`}
      android_ripple={{ color: colors.fill as string }}
      style={({ pressed }) => [
        styles.stat,
        { backgroundColor: colors.surface },
        isIOS && pressed && { opacity: 0.6 },
      ]}>
      <Icon sf={meta.sfSelected} md={meta.md} size={20} color={colors.status[status]} />
      <Text style={[styles.statCount, { color: colors.text }]}>{count}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>
        {meta.title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 8, paddingBottom: 32, gap: 28 },
  stats: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  stat: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: isIOS ? 16 : 20,
    borderCurve: 'continuous',
    overflow: 'hidden',
    gap: 2,
  },
  statCount: { fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'], marginTop: 4 },
  statLabel: { fontSize: 12, fontWeight: '500' },
  welcome: {
    marginHorizontal: 16,
    padding: 24,
    borderRadius: isIOS ? 24 : 28,
    borderCurve: 'continuous',
    alignItems: 'center',
    gap: 8,
  },
  welcomeTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  welcomeBody: { fontSize: 15, lineHeight: 21, textAlign: 'center' },
  welcomeAction: { marginTop: 12 },
});
