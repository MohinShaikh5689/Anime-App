import { Image } from 'expo-image';
import { type Href, Link, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';

import { ActionButton, IncrementButton } from '@/components/controls';
import { Icon } from '@/components/icon';
import { AmbientBackdrop, Breathing, PressableScale } from '@/components/motion';
import { Poster } from '@/components/poster';
import { PosterCard } from '@/components/poster-card';
import { PosterRow, RemoteShelf, Shelf } from '@/components/shelf';
import { useAnimeHref } from '@/components/tab-context';
import { LIST_STATUSES, type ListStatus, LISTS } from '@/constants/lists';
import { currentSeason } from '@/lib/anilist';
import { type LibraryEntry, useLibrary } from '@/store/library';
import { useUi } from '@/store/ui';
import { Fonts } from '@/theme/fonts';
import { useAppTheme } from '@/theme/theme';

const isIOS = Platform.OS === 'ios';
const SEASON = currentSeason();
const SEASON_LABEL = `${SEASON.season[0]}${SEASON.season.slice(1).toLowerCase()} ${SEASON.seasonYear}`;

const COZY_LINES = [
  'One episode at a time. 🍵',
  'No rush. Your shows will wait for you. 🌙',
  'Grab a blanket and press play. 🛋️',
  'Every story deserves a calm evening. ✨',
  'Rest your eyes between seasons. 🌸',
  'Snacks ready? 🍙',
  'Happy watching. 🌿',
];

function openLibrary(list: ListStatus) {
  useUi.getState().setLibraryList(list);
  router.navigate('/(library)' as Href);
}

function openSearch() {
  router.navigate('/(search)' as Href);
}

function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return { text: 'Up late?', emoji: '🌙' };
  if (h < 12) return { text: 'Good morning', emoji: '☀️' };
  if (h < 17) return { text: 'Good afternoon', emoji: '🌤️' };
  if (h < 21) return { text: 'Good evening', emoji: '🌆' };
  return { text: 'Cozy night in', emoji: '🌙' };
}

export function HomeScreen() {
  const { colors } = useAppTheme();
  const entries = useLibrary((s) => s.entries);

  const { byStatus, watching, upNext, picks, journey } = useMemo(() => {
    const all = Object.values(entries).sort((a, b) => b.updatedAt - a.updatedAt);
    const counts = Object.fromEntries(LIST_STATUSES.map((s) => [s, 0])) as Record<ListStatus, number>;
    let episodes = 0;
    for (const e of all) {
      counts[e.status] += 1;
      episodes += e.progress;
    }
    const watchingList = all.filter((e) => e.status === 'watching');
    const wishlist = all.filter((e) => e.status === 'wishlist').reverse();
    return {
      byStatus: counts,
      watching: watchingList,
      upNext: wishlist,
      picks: [
        ...watchingList.filter((e) => e.episodes == null || e.progress < e.episodes),
        ...wishlist,
      ],
      journey: { episodes, hours: Math.round((episodes * 24) / 60), finished: counts.watched },
    };
  }, [entries]);

  const [pickIndex, setPickIndex] = useState(0);
  const pick = picks.length ? picks[pickIndex % picks.length] : undefined;
  const isEmpty = Object.keys(entries).length === 0;
  const hello = greeting();
  const line = COZY_LINES[new Date().getDate() % COZY_LINES.length];

  const shuffle = () => {
    if (picks.length < 2) return;
    let next = pickIndex;
    while (next % picks.length === pickIndex % picks.length) {
      next = Math.floor(Math.random() * picks.length);
    }
    setPickIndex(next);
  };

  const featured = pick ?? watching[0];

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <AmbientBackdrop
        key={featured?.id ?? 'none'}
        uri={featured?.coverUrl}
        color={featured?.coverColor}
        height={520}
      />
      <ScrollView
        style={styles.fill}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}>
        <Animated.View entering={FadeInDown.duration(500)} style={styles.greeting}>
          <Text style={[styles.hello, { color: colors.text }]}>
            {hello.text} {hello.emoji}
          </Text>
          <Text style={[styles.helloSub, { color: colors.textSecondary }]}>
            {watching.length > 0
              ? `${watching.length} ${watching.length === 1 ? 'story' : 'stories'} in progress`
              : 'What will you watch tonight?'}
          </Text>
        </Animated.View>

        {isEmpty ? (
          <Animated.View
            entering={FadeInDown.delay(120).duration(500)}
            style={[styles.welcome, { backgroundColor: colors.surface }]}>
            <Breathing>
              <Text style={styles.welcomeEmoji}>🌸</Text>
            </Breathing>
            <Text style={[styles.welcomeTitle, { color: colors.text }]}>Start your little anime corner</Text>
            <Text style={[styles.welcomeBody, { color: colors.textSecondary }]}>
              Save shows for later, keep your place in what you&apos;re watching, and celebrate the ones you finish.
            </Text>
            <View style={styles.welcomeAction}>
              <ActionButton title="Find Anime" sf="magnifyingglass" md="search" variant="primary" onPress={openSearch} />
            </View>
          </Animated.View>
        ) : null}

        {pick ? (
          <Animated.View entering={FadeInDown.delay(80).duration(500)} style={styles.section}>
            <TonightsPick entry={pick} onShuffle={picks.length > 1 ? shuffle : undefined} />
          </Animated.View>
        ) : null}

        {!isEmpty ? (
          <Animated.View entering={FadeInDown.delay(160).duration(500)} style={styles.stats}>
            {LIST_STATUSES.map((status) => (
              <StatTile key={status} status={status} count={byStatus[status]} />
            ))}
          </Animated.View>
        ) : null}

        {watching.length > 0 ? (
          <Shelf title="Continue Watching" action={{ label: 'See All', onPress: () => openLibrary('watching') }}>
            <PosterRow<LibraryEntry>
              data={watching}
              width={140}
              keyOf={(e) => e.id}
              renderCard={(e, w) => <ContinueCard entry={e} width={w} />}
            />
          </Shelf>
        ) : null}

        {upNext.length > 0 ? (
          <Shelf title="Up Next" action={{ label: 'See All', onPress: () => openLibrary('wishlist') }}>
            <PosterRow<LibraryEntry>
              data={upNext}
              keyOf={(e) => e.id}
              renderCard={(e, w) => (
                <PosterCard anime={e} width={w} subtitle={e.episodes ? `${e.episodes} episodes` : null} />
              )}
            />
          </Shelf>
        ) : null}

        {journey.episodes > 0 ? <JourneyCard {...journey} /> : null}

        <RemoteShelf title="Trending Now" query={{ sort: 'TRENDING_DESC' }} />
        <RemoteShelf title={`Popular in ${SEASON_LABEL}`} query={{ ...SEASON, sort: 'POPULARITY_DESC' }} />
        <RemoteShelf title="Top Rated of All Time" query={{ sort: 'SCORE_DESC' }} />

        <Text style={[styles.footer, { color: colors.textSecondary }]}>{line}</Text>
      </ScrollView>
    </View>
  );
}

function ContinueCard({ entry, width }: { entry: LibraryEntry; width: number }) {
  const increment = useLibrary((s) => s.incrementProgress);
  const done = entry.episodes != null && entry.progress >= entry.episodes;
  return (
    <PosterCard
      anime={entry}
      width={width}
      progress={entry.episodes ? entry.progress / entry.episodes : null}
      subtitle={`Episode ${entry.progress}${entry.episodes ? ` of ${entry.episodes}` : ''}`}
      accessory={
        done ? null : (
          <IncrementButton
            value={entry.progress}
            onPress={() => increment(entry.id)}
            accessibilityLabel={`Mark episode ${entry.progress + 1} of ${entry.title} as watched`}
          />
        )
      }
    />
  );
}

/** A big, calm suggestion card: what to watch next, with a shuffle die. */
function TonightsPick({ entry, onShuffle }: { entry: LibraryEntry; onShuffle?: () => void }) {
  const href = useAnimeHref();
  const setStatus = useLibrary((s) => s.setStatus);
  const increment = useLibrary((s) => s.incrementProgress);
  const watchingNow = entry.status === 'watching';
  const nextEp = entry.progress + 1;

  return (
    <View style={styles.pickWrap}>
      <Animated.View key={entry.id} entering={FadeIn.duration(450)} exiting={FadeOut.duration(200)}>
        <Link href={href(entry.id)} asChild>
          <PressableScale scaleTo={0.98} style={styles.pick} accessibilityLabel={`Tonight's pick: ${entry.title}`}>
            <Image
              source={entry.coverUrl ? { uri: entry.coverUrl } : null}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              blurRadius={isIOS ? 40 : 20}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  experimental_backgroundImage:
                    'linear-gradient(to right, rgba(20,12,24,0.78) 0%, rgba(20,12,24,0.55) 60%, rgba(20,12,24,0.35) 100%)',
                },
              ]}
            />
            <Poster uri={entry.coverUrl} color={entry.coverColor} width={96} shadow />
            <View style={styles.pickBody}>
              <Text style={styles.pickEyebrow}>TONIGHT&apos;S PICK</Text>
              <Text style={styles.pickTitle} numberOfLines={2}>
                {entry.title}
              </Text>
              <Text style={styles.pickMeta} numberOfLines={1}>
                {watchingNow
                  ? `Episode ${nextEp}${entry.episodes ? ` of ${entry.episodes}` : ''} is waiting`
                  : 'From your wishlist'}
              </Text>
              <View style={styles.pickActions}>
                <PressableScale
                  haptic
                  onPress={() => (watchingNow ? increment(entry.id) : setStatus(entry, 'watching'))}
                  style={styles.pickButton}
                  accessibilityRole="button">
                  <Icon sf={watchingNow ? 'play.fill' : 'sparkles'} md={watchingNow ? 'play_arrow' : 'auto_awesome'} size={14} color="#2A1A22" />
                  <Text style={styles.pickButtonLabel}>{watchingNow ? `Watched Ep ${nextEp}` : 'Start Watching'}</Text>
                </PressableScale>
              </View>
            </View>
          </PressableScale>
        </Link>
      </Animated.View>
      {onShuffle ? (
        <PressableScale
          haptic
          onPress={onShuffle}
          style={styles.shuffle}
          accessibilityRole="button"
          accessibilityLabel="Suggest something else">
          <Icon sf="dice.fill" md="casino" size={18} color="#FFFFFF" />
        </PressableScale>
      ) : null}
    </View>
  );
}

function JourneyCard({ episodes, hours, finished }: { episodes: number; hours: number; finished: number }) {
  const { dark } = useAppTheme();
  const fg = dark ? '#FFE9F1' : '#3B2433';
  const sub = dark ? 'rgba(255,233,241,0.7)' : 'rgba(59,36,51,0.7)';
  return (
    <Animated.View
      entering={FadeInDown.duration(500)}
      style={[
        styles.journey,
        {
          experimental_backgroundImage: dark
            ? 'linear-gradient(135deg, #3A2230 0%, #25223F 100%)'
            : 'linear-gradient(135deg, #FFE3EC 0%, #E8E4FF 100%)',
        },
      ]}>
      <Text style={[styles.journeyEyebrow, { color: sub }]}>YOUR JOURNEY SO FAR</Text>
      <View style={styles.journeyRow}>
        <JourneyStat value={episodes} label="episodes" color={fg} sub={sub} />
        <JourneyStat value={hours} label="hours" color={fg} sub={sub} />
        <JourneyStat value={finished} label="finished" color={fg} sub={sub} />
      </View>
      <Text style={[styles.journeyLine, { color: sub }]}>
        {hours >= 24
          ? `That's more than ${Math.floor(hours / 24)} full ${Math.floor(hours / 24) === 1 ? 'day' : 'days'} of stories. 🌸`
          : 'Every episode counts. 🌱'}
      </Text>
    </Animated.View>
  );
}

function JourneyStat({ value, label, color, sub }: { value: number; label: string; color: string; sub: string }) {
  return (
    <View style={styles.journeyStat}>
      <Text style={[styles.journeyValue, { color }]}>{value.toLocaleString()}</Text>
      <Text style={[styles.journeyLabel, { color: sub }]}>{label}</Text>
    </View>
  );
}

function StatTile({ status, count }: { status: ListStatus; count: number }) {
  const { colors } = useAppTheme();
  const meta = LISTS[status];
  return (
    <PressableScale
      onPress={() => openLibrary(status)}
      accessibilityRole="button"
      accessibilityLabel={`${count} in ${meta.title}`}
      style={[styles.stat, { backgroundColor: colors.surface }]}>
      <Icon sf={meta.sfSelected} md={meta.md} size={20} color={colors.status[status]} />
      <Text style={[styles.statCount, { color: colors.text }]}>{count}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>
        {meta.title}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingBottom: 40, gap: 28 },
  greeting: { paddingHorizontal: 20, paddingTop: 4, gap: 2 },
  hello: { fontFamily: Fonts.display, fontSize: 30, letterSpacing: -0.3 },
  helloSub: { fontFamily: Fonts.label, fontSize: 16 },
  section: { paddingHorizontal: 16 },
  stats: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  stat: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderCurve: 'continuous',
    gap: 2,
  },
  statCount: { fontFamily: Fonts.display, fontSize: 24, marginTop: 4, fontVariant: ['tabular-nums'] },
  statLabel: { fontFamily: Fonts.label, fontSize: 12 },
  welcome: {
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 28,
    borderCurve: 'continuous',
    alignItems: 'center',
    gap: 8,
  },
  welcomeEmoji: { fontSize: 52 },
  welcomeTitle: { fontFamily: Fonts.display, fontSize: 22, textAlign: 'center', marginTop: 4 },
  welcomeBody: { fontFamily: Fonts.label, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  welcomeAction: { marginTop: 12 },
  pickWrap: { position: 'relative' },
  pick: {
    flexDirection: 'row',
    gap: 14,
    padding: 14,
    borderRadius: 26,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: '#2A1A22',
    boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
  },
  pickBody: { flex: 1, justifyContent: 'center', gap: 4, paddingRight: 28 },
  pickEyebrow: { fontFamily: Fonts.heading, fontSize: 11, letterSpacing: 1.2, color: 'rgba(255,220,232,0.85)' },
  pickTitle: { fontFamily: Fonts.display, fontSize: 21, lineHeight: 25, color: '#FFFFFF' },
  pickMeta: { fontFamily: Fonts.label, fontSize: 14, color: 'rgba(255,255,255,0.78)' },
  pickActions: { flexDirection: 'row', marginTop: 10 },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFE3EC',
  },
  pickButtonLabel: { fontFamily: Fonts.heading, fontSize: 14, color: '#2A1A22' },
  shuffle: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  journey: { marginHorizontal: 16, padding: 20, borderRadius: 26, borderCurve: 'continuous', gap: 12 },
  journeyEyebrow: { fontFamily: Fonts.heading, fontSize: 11, letterSpacing: 1.2 },
  journeyRow: { flexDirection: 'row' },
  journeyStat: { flex: 1 },
  journeyValue: { fontFamily: Fonts.display, fontSize: 30, fontVariant: ['tabular-nums'] },
  journeyLabel: { fontFamily: Fonts.label, fontSize: 13 },
  journeyLine: { fontFamily: Fonts.label, fontSize: 14 },
  footer: { fontFamily: Fonts.label, fontSize: 14, textAlign: 'center', marginTop: 8 },
});

