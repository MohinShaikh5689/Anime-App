import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { type Href, Link, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  interpolate,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { PlatformPressable } from '@/components/motion';
import { Art } from '@/components/poster';
import { PosterCard } from '@/components/poster-card';
import { ContinueCard } from '@/components/continue-card';
import { Fade } from '@/components/fade';
import { EpisodeBar } from '@/components/progress';
import { AnimeShelf, PosterRow, Shelf } from '@/components/shelf';
import { useAnimeHref } from '@/components/tab-context';
import type { ListStatus } from '@/constants/lists';
import {
  type AnimeSummary,
  currentSeason,
  type Feed,
  getFeed,
  getRecommendations,
  isManga,
  kindOf,
  type MediaKind,
  type Medium,
  mediaLabel,
  nextSeason,
  pickSummary,
  seasonLabel,
  unitsOf,
} from '@/lib/anilist';
import { isComplete, isUnaired, maxProgress, nextEpisodeLabel, premiereLabel } from '@/lib/airing';
import { readableOn, showAccent, withAlpha } from '@/lib/color';
import { useRequest } from '@/lib/use-request';
import { type LibraryEntry, useLibrary } from '@/store/library';
import { useUi } from '@/store/ui';
import { useAppTheme } from '@/theme/theme';
import { Type } from '@/theme/type';

const SEASON = currentSeason();
const NEXT_SEASON = nextSeason();

type HeroItem = { anime: AnimeSummary; entry?: LibraryEntry };

/** Big for short titles, stepping down so long ones stay readable in three lines. */
function heroTitleSize(title: string) {
  const fontSize = title.length > 40 ? 24 : title.length > 24 ? 28 : 34;
  return { fontSize, lineHeight: Math.round(fontSize * 1.18) };
}

type Row = { feed: string; title: string; ranked?: boolean } | { mine: 'recs' | 'finished' };

const ROWS: Record<Medium, Row[]> = {
  anime: [
    { feed: 'trending', title: 'Top 10 Today', ranked: true },
    { mine: 'recs' },
    { feed: 'airing', title: 'Airing Now' },
    { feed: 'season', title: `New in ${seasonLabel(SEASON)}` },
    { feed: 'upcoming', title: `Coming in ${seasonLabel(NEXT_SEASON)}` },
    { feed: 'movies', title: 'Movie Night' },
    { feed: 'action', title: 'Edge-of-Your-Seat Action' },
    { mine: 'finished' },
    { feed: 'sliceOfLife', title: 'Feel-Good Slice of Life' },
    { feed: 'romance', title: 'Romance Picks' },
    { feed: 'topRated', title: 'Highest Rated Ever' },
    { feed: 'allTime', title: 'All-Time Favorites' },
  ],
  manga: [
    { feed: 'trending', title: 'Top 10 Today', ranked: true },
    { mine: 'recs' },
    { feed: 'manhwa', title: 'Trending Manhwa' },
    { feed: 'manga', title: 'Trending Manga' },
    { feed: 'ongoing', title: 'New Chapters Every Week' },
    { feed: 'actionManhwa', title: 'Action Manhwa' },
    { feed: 'completed', title: 'Binge-Ready: Completed Series' },
    { mine: 'finished' },
    { feed: 'romanceManhwa', title: 'Romance Manhwa' },
    { feed: 'fantasy', title: 'Fantasy Worlds' },
    { feed: 'manhua', title: 'Hot Manhua' },
    { feed: 'topRated', title: 'Highest Rated Ever' },
    { feed: 'allTime', title: 'All-Time Favorites' },
  ],
};

function openLibrary(list: ListStatus, kind?: MediaKind) {
  useUi.getState().setLibraryList(list);
  if (kind) useUi.getState().setLibraryKind(kind);
  router.navigate('/(library)' as Href);
}

/** A discovery home: anime on the Home tab, manga/manhwa on the Manga tab. */
export function HomeScreen({ medium = 'anime' }: { medium?: Medium }) {
  const { colors, canvas } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const entries = useLibrary((s) => s.entries);
  const heroHeight = Math.min(Math.round(height * 0.7), 640);

  const fetchFeed = useCallback((signal: AbortSignal) => getFeed(medium, signal), [medium]);
  const feed = useRequest<Feed>(`home:feed:${medium}`, fetchFeed);
  const comics = medium === 'manga';

  const { watching, wishlist, finished, seed, hero } = useMemo(() => {
    const all = Object.values(entries)
      .filter((e) => isManga(e) === comics)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    const watchingList = all.filter((e) => e.status === 'watching');
    const wishlistList = all.filter((e) => e.status === 'wishlist');
    const finishedList = all.filter((e) => e.status === 'watched');
    // Recommendations come from your best-rated finished show, else what you're watching.
    const seedEntry =
      [...finishedList].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0] ?? watchingList[0] ?? wishlistList[0];
    const mine: HeroItem[] = [
      ...watchingList.filter((e) => !isComplete(e, e.progress)),
      ...wishlistList,
    ]
      .slice(0, 5)
      .map((e) => ({ anime: e, entry: e }));
    const fill = (feed.data?.trending ?? [])
      .filter((a) => !entries[a.id])
      .slice(0, Math.max(0, 6 - mine.length))
      .map((a) => ({ anime: a }));
    return {
      watching: watchingList,
      wishlist: wishlistList,
      finished: finishedList,
      seed: seedEntry,
      hero: [...mine, ...fill],
    };
  }, [entries, feed.data, comics]);

  const fetchRecs = useCallback(
    (signal: AbortSignal) => getRecommendations(seed?.id ?? 0, signal),
    [seed?.id]
  );
  const recs = useRequest(seed ? `recs:${seed.id}` : null, fetchRecs);

  const [page, setPage] = useState(0);
  const current = hero[Math.min(page, hero.length - 1)];
  const glow = showAccent(current?.anime.coverColor, colors.primary);
  const kindFor = (list: LibraryEntry[]): MediaKind => (comics ? kindOf(list[0] ?? { type: 'MANGA' }) : 'anime');

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });

  const onPage = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <Animated.View
        key={glow}
        entering={FadeIn.duration(600)}
        pointerEvents="none"
        style={[
          styles.glow,
          {
            top: heroHeight * 0.55,
            height: heroHeight,
            experimental_backgroundImage: `linear-gradient(to bottom, ${withAlpha(glow, 0)} 0%, ${withAlpha(glow, 0.28)} 35%, ${withAlpha(canvas, 0)} 100%)`,
          },
        ]}
      />
      <Animated.ScrollView
        style={styles.fill}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}>
        {hero.length ? (
          <View style={{ height: heroHeight }}>
            <FlatList
              horizontal
              pagingEnabled
              data={hero}
              keyExtractor={(h) => String(h.anime.id)}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onPage}
              renderItem={({ item }) => (
                <HeroSlide item={item} width={width} height={heroHeight} scrollY={scrollY} canvas={canvas} />
              )}
            />
            {hero.length > 1 ? (
              <View style={styles.dots} accessibilityElementsHidden>
                {hero.map((h, i) => (
                  <View
                    key={h.anime.id}
                    style={[
                      styles.dot,
                      { backgroundColor: i === page ? (colors.text as string) : (colors.fill as string) },
                      i === page && styles.dotActive,
                    ]}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <View style={{ height: heroHeight * 0.6 }} />
        )}

        <View style={styles.rows}>
          {watching.length > 0 ? (
            <Shelf
              title={comics ? 'Continue Reading' : 'Continue Watching'}
              action={
                watching.length > 4 ? { label: 'See All', onPress: () => openLibrary('watching', kindFor(watching)) } : undefined
              }>
              <PosterRow<LibraryEntry>
                data={watching}
                width={Math.min(320, width * 0.82)}
                keyOf={(e) => e.id}
                renderCard={(e, w) => <ContinueCard entry={e} width={w} />}
              />
            </Shelf>
          ) : null}

          {wishlist.length > 0 ? (
            <Shelf title="Your Wishlist" action={{ label: 'See All', onPress: () => openLibrary('wishlist', kindFor(wishlist)) }}>
              <PosterRow<LibraryEntry>
                data={wishlist}
                keyOf={(e) => e.id}
                renderCard={(e, w) => (
                  <PosterCard anime={e} width={w} subtitle={[mediaLabel(e), e.year].filter(Boolean).join(' · ')} />
                )}
              />
            </Shelf>
          ) : null}

          {ROWS[medium].map((row) => {
            if ('feed' in row) {
              return (
                <AnimeShelf
                  key={row.feed}
                  title={row.title}
                  data={feed.data?.[row.feed]}
                  error={feed.error}
                  onRetry={feed.retry}
                  ranked={row.ranked}
                />
              );
            }
            if (row.mine === 'recs') {
              return seed ? (
                <AnimeShelf
                  key="recs"
                  title={`Because you liked ${seed.title}`}
                  data={recs.data?.filter((a) => !entries[a.id])}
                  error={recs.error}
                  onRetry={recs.retry}
                />
              ) : null;
            }
            return finished.length > 0 ? (
              <Shelf
                key="finished"
                title={comics ? 'Read by You' : 'Finished by You'}
                action={{ label: 'See All', onPress: () => openLibrary('watched', kindFor(finished)) }}>
                <PosterRow<LibraryEntry>
                  data={finished}
                  keyOf={(e) => e.id}
                  renderCard={(e, w) => (
                    <PosterCard anime={e} width={w} subtitle={e.rating ? `Your rating ${e.rating}/5` : 'Not rated yet'} />
                  )}
                />
              </Shelf>
            ) : null;
          })}
        </View>
      </Animated.ScrollView>

      {/* Positioned by a plain View: Link's slot doesn't forward absolute positioning reliably. */}
      <View style={[styles.account, { top: insets.top + 8 }]}>
        <Link href="/account" asChild>
          <PlatformPressable haptic accessibilityRole="button" accessibilityLabel="Account" style={styles.accountButton}>
            <Icon sf="person.crop.circle.fill" md="account_circle" size={28} color="#FFFFFF" />
          </PlatformPressable>
        </Link>
      </View>
    </View>
  );
}

function HeroSlide({
  item,
  width,
  height,
  scrollY,
  canvas,
}: {
  item: HeroItem;
  width: number;
  height: number;
  scrollY: SharedValue<number>;
  canvas: string;
}) {
  const { colors } = useAppTheme();
  const href = useAnimeHref();
  const increment = useLibrary((s) => s.incrementProgress);
  const setStatus = useLibrary((s) => s.setStatus);
  const { anime, entry } = item;
  const accent = showAccent(anime.coverColor, colors.primary as string);
  const onAccent = readableOn(accent);

  // Art drifts at half speed on scroll and stretches when pulled down.
  const parallax = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [-200, 0, height], [-100, 0, height * 0.45], 'clamp') },
      { scale: interpolate(scrollY.value, [-200, 0], [1.3, 1], 'clamp') },
    ],
  }));

  const watching = entry?.status === 'watching';
  const nextEp = (entry?.progress ?? 0) + 1;
  const units = unitsOf(anime);
  const waiting = watching
    ? entry.progress >= maxProgress(anime)
    : entry?.status === 'wishlist' && isUnaired(anime);
  const action: { label: string; sf: SFSymbol; md: AndroidSymbol; run?: () => void } = waiting
    ? {
        label: watching ? nextEpisodeLabel(anime) : premiereLabel(anime),
        sf: 'calendar',
        md: 'event',
      }
    : watching
    ? { label: `Log ${units.one} ${nextEp}`, sf: 'checkmark' as const, md: 'check' as const, run: () => increment(anime.id) }
    : entry?.status === 'wishlist'
      ? {
          label: units.start,
          sf: 'play.fill' as const,
          md: 'play_arrow' as const,
          run: () => setStatus(entry, 'watching'),
        }
      : {
          label: 'Add to Wishlist',
          sf: 'plus' as const,
          md: 'add' as const,
          run: () => setStatus(pickSummary(anime), 'wishlist'),
        };
  const kicker = watching ? `Continue ${units.verb.toLowerCase()}` : entry?.status === 'wishlist' ? 'From your wishlist' : 'Trending now';

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <Animated.View style={[StyleSheet.absoluteFill, parallax]}>
        <Art uri={anime.coverUrl} color={anime.coverColor} style={StyleSheet.absoluteFill} contentPosition="top" />
      </Animated.View>
      {/* Keeps the status bar legible over bright art. */}
      <Fade color="#000000" height={140} max={0.45} flip style={styles.heroTop} />
      {/* Text sits on solid page colour, so it reads over any artwork. */}
      <View style={styles.heroBottom}>
        <Fade color={canvas} height={120} />
        <View style={[styles.heroBody, { backgroundColor: canvas }]}>
        <View style={[styles.heroKicker, { backgroundColor: accent }]}>
          <Text style={[styles.heroKickerLabel, { color: onAccent }]}>{kicker.toUpperCase()}</Text>
        </View>
        <Link href={href(anime.id)} asChild>
          <Text style={[styles.heroTitle, heroTitleSize(anime.title), { color: colors.text }]} numberOfLines={3}
            accessibilityRole="link">
            {anime.title}
          </Text>
        </Link>
        <Text style={[Type.subhead, styles.heroMeta, { color: colors.text }]} numberOfLines={1}>
          {[
            mediaLabel(anime),
            anime.year,
            anime.episodes ? `${anime.episodes} ${units.many}` : null,
            anime.averageScore ? `${anime.averageScore}% rating` : null,
          ]
            .filter(Boolean)
            .join('  ·  ')}
        </Text>
        {entry && watching ? (
          <View style={styles.heroProgress}>
            <EpisodeBar progress={entry.progress} total={entry.episodes} color={accent} height={5} />
          </View>
        ) : null}
        <View style={styles.heroActions}>
          {action.run ? (
            <PlatformPressable
              haptic
              onPress={action.run}
              accessibilityRole="button"
              style={[styles.primary, { backgroundColor: accent, boxShadow: `0 10px 30px ${withAlpha(accent, 0.45)}` }]}>
              <Icon sf={action.sf} md={action.md} size={18} color={onAccent} />
              <Text style={[styles.primaryLabel, { color: onAccent }]}>{action.label}</Text>
            </PlatformPressable>
          ) : (
            <View style={[styles.primary, { backgroundColor: colors.fill }]}>
              <Icon sf={action.sf} md={action.md} size={18} color={accent} />
              <Text style={[styles.primaryLabel, { color: colors.text }]} numberOfLines={1}>
                {action.label}
              </Text>
            </View>
          )}
          <Link href={href(anime.id)} asChild>
            <PlatformPressable
              accessibilityRole="button"
              accessibilityLabel={`Details for ${anime.title}`}
              style={[styles.secondary, { backgroundColor: colors.fill }]}>
              <Icon sf="info.circle" md="info" size={22} color={colors.text} />
            </PlatformPressable>
          </Link>
        </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  glow: { position: 'absolute', left: 0, right: 0 },
  heroTop: { position: 'absolute', top: 0, left: 0, right: 0 },
  heroBottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  heroBody: { paddingHorizontal: 20, paddingBottom: 28, gap: 8 },
  heroKicker: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  heroKickerLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  // The system face at heavy weight: crisp at any size and in long titles.
  heroTitle: { fontWeight: '800' },
  heroMeta: { fontWeight: '600', opacity: 0.8 },
  heroProgress: { marginTop: 6, width: '70%' },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  primary: {
    flex: 1,
    minHeight: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  primaryLabel: { ...Type.headline, fontWeight: '700' },
  secondary: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  dots: { position: 'absolute', bottom: 8, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { width: 18 },
  rows: { gap: 34, paddingTop: 20 },
  account: { position: 'absolute', right: 16 },
  accountButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
});
