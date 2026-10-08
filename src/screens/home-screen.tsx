import { type Href, Link, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton, IncrementButton } from '@/components/controls';
import { EpisodeReadout, FrameStrip } from '@/components/frames';
import { Icon } from '@/components/icon';
import { PlatformPressable } from '@/components/motion';
import { Poster } from '@/components/poster';
import { RemoteShelf, SectionHeader } from '@/components/shelf';
import { useAnimeHref } from '@/components/tab-context';
import type { ListStatus } from '@/constants/lists';
import { currentSeason, describeAnime } from '@/lib/anilist';
import { type LibraryEntry, useLibrary } from '@/store/library';
import { useUi } from '@/store/ui';
import { useAppTheme } from '@/theme/theme';
import { Type } from '@/theme/type';

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

  const { watching, wishlist } = useMemo(() => {
    const all = Object.values(entries).sort((a, b) => b.updatedAt - a.updatedAt);
    return {
      watching: all.filter((e) => e.status === 'watching'),
      wishlist: all.filter((e) => e.status === 'wishlist').reverse(),
    };
  }, [entries]);

  const [pickIndex, setPickIndex] = useState(0);
  const pick = wishlist.length ? wishlist[pickIndex % wishlist.length] : undefined;
  const shuffle = () => {
    if (wishlist.length < 2) return;
    let next = pickIndex;
    while (next % wishlist.length === pickIndex % wishlist.length) {
      next = Math.floor(Math.random() * wishlist.length);
    }
    setPickIndex(next);
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}>
      {watching.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            title="On the sheet"
            action={watching.length > 6 ? { label: 'See All', onPress: () => openLibrary('watching') } : undefined}
          />
          <View style={[styles.group, { backgroundColor: colors.surface }]}>
            {watching.slice(0, 6).map((e, i) => (
              <SheetRow key={e.id} entry={e} first={i === 0} />
            ))}
          </View>
        </View>
      ) : null}

      {pick ? (
        <View style={styles.section}>
          <SectionHeader title="For tonight" action={{ label: 'Wishlist', onPress: () => openLibrary('wishlist') }} />
          <PickRow entry={pick} onShuffle={wishlist.length > 1 ? shuffle : undefined} />
        </View>
      ) : null}

      {watching.length === 0 && !pick ? (
        <View style={[styles.empty, { backgroundColor: colors.surface }]}>
          <FrameStrip progress={0} total={8} height={12} />
          <Text style={[Type.title3, styles.emptyTitle, { color: colors.text }]}>Your sheet is blank</Text>
          <Text style={[Type.subhead, styles.emptyBody, { color: colors.textSecondary }]}>
            Add shows from Search. What you&apos;re watching appears here, one frame per episode.
          </Text>
          <ActionButton title="Find Anime" sf="magnifyingglass" md="search" variant="primary" onPress={openSearch} />
        </View>
      ) : null}

      <RemoteShelf title="Trending now" query={{ sort: 'TRENDING_DESC' }} ranked />
      <RemoteShelf title={SEASON_LABEL} query={{ ...SEASON, sort: 'POPULARITY_DESC' }} />
      <RemoteShelf title="Top rated" query={{ sort: 'SCORE_DESC' }} ranked />
    </ScrollView>
  );
}

/** One show on the sheet: cover, title, readout, frame strip, and +1. */
function SheetRow({ entry, first }: { entry: LibraryEntry; first: boolean }) {
  const { colors } = useAppTheme();
  const href = useAnimeHref();
  const increment = useLibrary((s) => s.incrementProgress);
  const done = entry.episodes != null && entry.progress >= entry.episodes;

  return (
    <View
      style={[
        styles.row,
        !first && { borderTopColor: colors.rule as string, borderTopWidth: StyleSheet.hairlineWidth * 2 },
      ]}>
      <Link href={href(entry.id)} asChild>
        <Pressable style={styles.rowMain} accessibilityRole="button" android_ripple={{ color: colors.fill as string }}>
          <Poster uri={entry.coverUrl} color={entry.coverColor} width={48} />
          <View style={styles.rowBody}>
            <View style={styles.rowTop}>
              <Text style={[Type.headline, styles.flex, { color: colors.text }]} numberOfLines={2}>
                {entry.title}
              </Text>
              <EpisodeReadout progress={entry.progress} total={entry.episodes} size={16} />
            </View>
            <FrameStrip progress={entry.progress} total={entry.episodes} height={10} />
          </View>
        </Pressable>
      </Link>
      {done ? null : (
        <IncrementButton
          onPress={() => increment(entry.id)}
          accessibilityLabel={`Mark episode ${entry.progress + 1} of ${entry.title} as watched`}
        />
      )}
    </View>
  );
}

function PickRow({ entry, onShuffle }: { entry: LibraryEntry; onShuffle?: () => void }) {
  const { colors } = useAppTheme();
  const href = useAnimeHref();
  const setStatus = useLibrary((s) => s.setStatus);

  return (
    <View style={[styles.group, styles.pick, { backgroundColor: colors.surface }]}>
      <Link href={href(entry.id)} asChild>
        <PlatformPressable style={styles.pickMain} accessibilityRole="button" accessibilityLabel={entry.title}>
          <Poster uri={entry.coverUrl} color={entry.coverColor} width={72} />
          <View style={styles.rowBody}>
            <Text style={[Type.headline, { color: colors.text }]} numberOfLines={2}>
              {entry.title}
            </Text>
            <Text style={[Type.footnote, { color: colors.textSecondary }]} numberOfLines={1}>
              {describeAnime(entry)}
            </Text>
          </View>
        </PlatformPressable>
      </Link>
      <View style={styles.pickActions}>
        <ActionButton
          title="Start Watching"
          sf="play.fill"
          md="play_arrow"
          variant="tonal"
          onPress={() => setStatus(entry, 'watching')}
        />
        {onShuffle ? (
          <PlatformPressable
            haptic
            onPress={onShuffle}
            style={[styles.shuffle, { backgroundColor: colors.fill }]}
            accessibilityRole="button"
            accessibilityLabel="Suggest another show from your wishlist">
            <Icon sf="shuffle" md="shuffle" size={18} color={colors.primary} />
          </PlatformPressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 8, paddingBottom: 40, gap: 32 },
  section: { gap: 12 },
  flex: { flex: 1 },
  group: {
    marginHorizontal: 16,
    borderRadius: isIOS ? 14 : 20,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingRight: 8 },
  rowBody: { flex: 1, gap: 8 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  pick: { padding: 12, gap: 12 },
  pickMain: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  pickActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  shuffle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  empty: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: isIOS ? 14 : 20,
    borderCurve: 'continuous',
    gap: 12,
    alignItems: 'flex-start',
  },
  emptyTitle: { marginTop: 4 },
  emptyBody: { marginBottom: 4 },
});
