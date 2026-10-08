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
import { Art, Poster } from '@/components/poster';
import { PosterCard } from '@/components/poster-card';
import { EpisodeBar } from '@/components/progress';
import { PosterRow, RemoteShelf, Shelf } from '@/components/shelf';
import { useAnimeHref } from '@/components/tab-context';
import type { ListStatus } from '@/constants/lists';
import { type AnimeSummary, browseAnime, currentSeason, formatLabel, pickSummary } from '@/lib/anilist';
import { readableOn, showAccent, withAlpha } from '@/lib/color';
import { useRequest } from '@/lib/use-request';
import { type LibraryEntry, useLibrary } from '@/store/library';
import { useUi } from '@/store/ui';
import { Fonts } from '@/theme/fonts';
import { useAppTheme } from '@/theme/theme';
import { Type } from '@/theme/type';

const SEASON = currentSeason();
const SEASON_LABEL = `${SEASON.season[0]}${SEASON.season.slice(1).toLowerCase()} ${SEASON.seasonYear}`;

type HeroItem = { anime: AnimeSummary; entry?: LibraryEntry };

function openLibrary(list: ListStatus) {
  useUi.getState().setLibraryList(list);
  router.navigate('/(library)' as Href);
}

export function HomeScreen() {
  const { colors, canvas } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const entries = useLibrary((s) => s.entries);
  const heroHeight = Math.min(Math.round(height * 0.7), 640);

  const fetchTrending = useCallback(
    (signal: AbortSignal) => browseAnime({ sort: 'TRENDING_DESC', perPage: 8 }, signal),
    []
  );
  const trending = useRequest('hero:trending', fetchTrending);

  const { watching, wishlist, hero } = useMemo(() => {
    const all = Object.values(entries).sort((a, b) => b.updatedAt - a.updatedAt);
    const watchingList = all.filter((e) => e.status === 'watching');
    const wishlistList = all.filter((e) => e.status === 'wishlist');
    const mine: HeroItem[] = [
      ...watchingList.filter((e) => e.episodes == null || e.progress < e.episodes),
      ...wishlistList,
    ]
      .slice(0, 5)
      .map((e) => ({ anime: e, entry: e }));
    const fill = (trending.data ?? [])
      .filter((a) => !entries[a.id])
      .slice(0, Math.max(0, 6 - mine.length))
      .map((a) => ({ anime: a }));
    return { watching: watchingList, wishlist: wishlistList, hero: [...mine, ...fill] };
  }, [entries, trending.data]);

  const [page, setPage] = useState(0);
  const current = hero[Math.min(page, hero.length - 1)];
  const glow = showAccent(current?.anime.coverColor, colors.primary as string);

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
              title="Continue Watching"
              action={watching.length > 4 ? { label: 'See All', onPress: () => openLibrary('watching') } : undefined}>
              <PosterRow<LibraryEntry>
                data={watching}
                width={Math.min(320, width * 0.82)}
                keyOf={(e) => e.id}
                renderCard={(e, w) => <ContinueCard entry={e} width={w} />}
              />
            </Shelf>
          ) : null}

          {wishlist.length > 0 ? (
            <Shelf title="Your Wishlist" action={{ label: 'See All', onPress: () => openLibrary('wishlist') }}>
              <PosterRow<LibraryEntry>
                data={wishlist}
                keyOf={(e) => e.id}
                renderCard={(e, w) => (
                  <PosterCard
                    anime={e}
                    width={w}
                    subtitle={[formatLabel(e.format), e.year].filter(Boolean).join(' · ')}
                  />
                )}
              />
            </Shelf>
          ) : null}

          <RemoteShelf title="Top 10 Today" query={{ sort: 'TRENDING_DESC' }} ranked />
          <RemoteShelf title={`New in ${SEASON_LABEL}`} query={{ ...SEASON, sort: 'POPULARITY_DESC' }} />
          <RemoteShelf title="Highest Rated" query={{ sort: 'SCORE_DESC' }} />
        </View>
      </Animated.ScrollView>

      <Link href="/account" asChild>
        <PlatformPressable
          haptic
          accessibilityRole="button"
          accessibilityLabel="Account"
          style={[styles.account, { top: insets.top + 8 }]}>
          <Icon sf="person.crop.circle.fill" md="account_circle" size={28} color="#FFFFFF" />
        </PlatformPressable>
      </Link>
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
  const action = watching
    ? { label: `Log Episode ${nextEp}`, sf: 'checkmark' as const, md: 'check' as const, run: () => increment(anime.id) }
    : entry?.status === 'wishlist'
      ? {
          label: 'Start Watching',
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
  const kicker = watching ? 'Continue watching' : entry?.status === 'wishlist' ? 'From your wishlist' : 'Trending now';

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <Animated.View style={[StyleSheet.absoluteFill, parallax]}>
        <Art uri={anime.coverUrl} color={anime.coverColor} style={StyleSheet.absoluteFill} contentPosition="top" />
      </Animated.View>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            experimental_backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 22%, ${withAlpha(canvas, 0)} 45%, ${withAlpha(canvas, 0.85)} 80%, ${canvas} 100%)`,
          },
        ]}
      />
      <View style={styles.heroBody}>
        <Text style={[Type.footnote, styles.heroKicker, { color: accent }]}>{kicker}</Text>
        <Link href={href(anime.id)} asChild>
          <Text style={[styles.heroTitle, { color: colors.text }]} numberOfLines={2} accessibilityRole="link">
            {anime.title}
          </Text>
        </Link>
        <Text style={[Type.subhead, { color: colors.textSecondary }]} numberOfLines={1}>
          {[
            formatLabel(anime.format),
            anime.year,
            anime.episodes ? `${anime.episodes} episodes` : null,
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
          <PlatformPressable
            haptic
            onPress={action.run}
            accessibilityRole="button"
            style={[styles.primary, { backgroundColor: accent, boxShadow: `0 10px 30px ${withAlpha(accent, 0.45)}` }]}>
            <Icon sf={action.sf} md={action.md} size={18} color={onAccent} />
            <Text style={[styles.primaryLabel, { color: onAccent }]}>{action.label}</Text>
          </PlatformPressable>
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
  );
}

/** Up-next card: poster, title, progress and a +1 button, tinted in the show's colour. */
function ContinueCard({ entry, width }: { entry: LibraryEntry; width: number }) {
  const { colors } = useAppTheme();
  const href = useAnimeHref();
  const increment = useLibrary((s) => s.incrementProgress);
  const accent = showAccent(entry.coverColor, colors.primary as string);
  const onAccent = readableOn(accent);
  const done = entry.episodes != null && entry.progress >= entry.episodes;

  return (
    <View
      style={[
        styles.card,
        {
          width,
          backgroundColor: colors.surface,
          borderColor: withAlpha(accent, 0.35),
          experimental_backgroundImage: `linear-gradient(120deg, ${withAlpha(accent, 0.32)} 0%, ${withAlpha(accent, 0.08)} 100%)`,
        },
      ]}>
      <Link href={href(entry.id)} asChild>
        <PlatformPressable accessibilityRole="button" accessibilityLabel={entry.title} style={styles.cardMain}>
          <Poster uri={entry.coverUrl} color={entry.coverColor} width={78} />
          <View style={styles.cardBody}>
            <Text style={[Type.headline, { color: colors.text }]} numberOfLines={2}>
              {entry.title}
            </Text>
            <Text style={[Type.footnote, { color: colors.textSecondary }]}>
              {entry.progress === 0
                ? 'Not started'
                : `Episode ${entry.progress}${entry.episodes ? ` of ${entry.episodes}` : ''}`}
            </Text>
            <EpisodeBar progress={entry.progress} total={entry.episodes} color={accent} height={5} />
          </View>
        </PlatformPressable>
      </Link>
      {done ? null : (
        <PlatformPressable
          haptic
          onPress={() => increment(entry.id)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Mark episode ${entry.progress + 1} of ${entry.title} as watched`}
          style={[styles.plusOne, { backgroundColor: accent }]}>
          <Icon sf="plus" md="add" size={14} color={onAccent} />
          <Text style={[Type.footnote, styles.plusOneLabel, { color: onAccent }]}>Episode {entry.progress + 1}</Text>
        </PlatformPressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  glow: { position: 'absolute', left: 0, right: 0 },
  heroBody: { position: 'absolute', left: 0, right: 0, bottom: 28, paddingHorizontal: 20, gap: 8 },
  heroKicker: { fontWeight: '700', letterSpacing: 0.4 },
  heroTitle: { fontFamily: Fonts.display, fontSize: 40, lineHeight: 42, letterSpacing: -1.2 },
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
  card: {
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: 12,
    gap: 12,
    overflow: 'hidden',
  },
  cardMain: { flexDirection: 'row', gap: 14 },
  cardBody: { flex: 1, gap: 6, justifyContent: 'center' },
  plusOne: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    borderRadius: 20,
  },
  plusOneLabel: { fontWeight: '700' },
  account: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
});
