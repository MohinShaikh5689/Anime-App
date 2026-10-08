import { Stack, router } from 'expo-router';
import { type PropsWithChildren, useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CharacterRow } from '@/components/character-row';
import { ActionButton, StatusPicker } from '@/components/controls';
import { Icon } from '@/components/icon';
import { PlatformPressable } from '@/components/motion';
import { Art, Poster } from '@/components/poster';
import { EpisodeBar, EpisodeTiles } from '@/components/progress';
import { RatingStars } from '@/components/rating-stars';
import { ErrorState, LoadingState } from '@/components/states';
import { type AnimeSummary, formatLabel, getAnime, pickSummary } from '@/lib/anilist';
import { readableOn, showAccent, withAlpha } from '@/lib/color';
import { useRequest } from '@/lib/use-request';
import { useEntry, useLibrary } from '@/store/library';
import { Fonts } from '@/theme/fonts';
import { useAppTheme } from '@/theme/theme';
import { Type } from '@/theme/type';

export function AnimeDetailScreen({ id }: { id: number }) {
  const { colors, canvas } = useAppTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const entry = useEntry(id);
  const { setStatus, setProgress, setRating, remove, incrementProgress } = useLibrary.getState();
  const fetcher = useCallback((signal: AbortSignal) => getAnime(id, signal), [id]);
  const { data: details, error, retry } = useRequest(`anime:${id}`, fetcher);
  const [expanded, setExpanded] = useState(false);

  const bannerHeight = Math.round(width * 0.95);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  const stretch = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [-300, 0, bannerHeight], [-150, 0, bannerHeight * 0.5], 'clamp') },
      { scale: interpolate(scrollY.value, [-300, 0], [1.6, 1], 'clamp') },
    ],
  }));

  // Library entries render instantly (and offline); details fill in when loaded.
  const anime: AnimeSummary | undefined = details ?? entry;

  if (!anime) {
    return (
      <View style={[styles.fill, styles.loading, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: '' }} />
        {error ? <ErrorState error={error} onRetry={retry} /> : <LoadingState />}
      </View>
    );
  }

  const accent = showAccent(anime.coverColor, colors.primary as string);
  const onAccent = readableOn(accent);
  const art = details?.bannerUrl ?? anime.bannerUrl ?? anime.coverUrl;

  const confirmRemove = () =>
    Alert.alert('Remove from Library?', `${anime.title} will be removed from all your lists.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          remove(id);
          if (router.canGoBack()) router.back();
        },
      },
    ]);

  const primary = !entry
    ? { label: 'Add to Wishlist', sf: 'plus' as const, md: 'add' as const, run: () => setStatus(pickSummary(anime), 'wishlist') }
    : entry.status === 'wishlist'
      ? { label: 'Start Watching', sf: 'play.fill' as const, md: 'play_arrow' as const, run: () => setStatus(pickSummary(anime), 'watching') }
      : entry.status === 'watching' && (entry.episodes == null || entry.progress < entry.episodes)
        ? { label: `Log Episode ${entry.progress + 1}`, sf: 'checkmark' as const, md: 'check' as const, run: () => incrementProgress(id) }
        : null;

  const meta = [
    formatLabel(anime.format),
    anime.year,
    anime.episodes ? `${anime.episodes} eps` : null,
    details?.studios[0] ?? null,
  ].filter(Boolean);

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: '' }} />
      <Animated.View style={[styles.banner, { height: bannerHeight }, stretch]} pointerEvents="none">
        <Art uri={art} color={anime.coverColor} style={StyleSheet.absoluteFill} contentPosition="top" />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              experimental_backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 30%, ${withAlpha(canvas, 0.2)} 55%, ${canvas} 100%)`,
            },
          ]}
        />
      </Animated.View>
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            top: bannerHeight * 0.6,
            height: bannerHeight * 1.2,
            experimental_backgroundImage: `linear-gradient(to bottom, ${withAlpha(accent, 0)} 0%, ${withAlpha(accent, 0.22)} 30%, ${withAlpha(canvas, 0)} 100%)`,
          },
        ]}
      />

      <Animated.ScrollView
        style={styles.fill}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingTop: bannerHeight * 0.55, paddingBottom: insets.bottom + 110 }}>
        <View style={styles.hero}>
          <View style={styles.poster}>
            <Poster uri={anime.coverUrl} color={anime.coverColor} width={112} />
          </View>
          <View style={styles.heroText}>
            <Text style={[styles.title, { color: colors.text }]} selectable numberOfLines={4}>
              {anime.title}
            </Text>
            {details?.nativeTitle ? (
              <Text style={[Type.footnote, { color: colors.textSecondary }]} numberOfLines={1}>
                {details.nativeTitle}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.metaRow}>
          {anime.averageScore ? (
            <View style={[styles.score, { backgroundColor: accent }]}>
              <Icon sf="star.fill" md="star" size={13} color={onAccent} />
              <Text style={[styles.scoreText, { color: onAccent }]}>{anime.averageScore}%</Text>
            </View>
          ) : null}
          <Text style={[Type.subhead, styles.flex, { color: colors.textSecondary }]} numberOfLines={1}>
            {meta.join('  ·  ')}
          </Text>
        </View>

        {details?.genres.length ? (
          <View style={styles.genres}>
            {details.genres.slice(0, 5).map((g) => (
              <View key={g} style={[styles.genre, { borderColor: withAlpha(accent, 0.5) }]}>
                <Text style={[Type.footnote, { color: colors.text }]}>{g}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {primary ? (
          <PlatformPressable
            haptic
            onPress={primary.run}
            accessibilityRole="button"
            style={[styles.primary, { backgroundColor: accent, boxShadow: `0 12px 30px ${withAlpha(accent, 0.4)}` }]}>
            <Icon sf={primary.sf} md={primary.md} size={18} color={onAccent} />
            <Text style={[styles.primaryLabel, { color: onAccent }]}>{primary.label}</Text>
          </PlatformPressable>
        ) : entry?.status === 'watched' ? (
          <View style={[styles.done, { backgroundColor: withAlpha(accent, 0.16) }]}>
            <Icon sf="checkmark.seal.fill" md="verified" size={20} color={accent} />
            <Text style={[Type.headline, { color: colors.text }]}>Finished</Text>
          </View>
        ) : null}

        {entry ? (
          <Section
            title="Episodes"
            accessory={
              <Text style={[Type.subhead, { color: colors.textSecondary }]}>
                {entry.progress}
                {entry.episodes ? ` / ${entry.episodes}` : ' watched'}
              </Text>
            }>
            <View style={styles.padded}>
              <EpisodeBar progress={entry.progress} total={entry.episodes} color={accent} height={6} />
            </View>
            <EpisodeTiles progress={entry.progress} total={entry.episodes} color={accent} onSet={(n) => setProgress(id, n)} />
          </Section>
        ) : null}

        <Section title={entry ? 'Your list' : 'Add to a list'}>
          <View style={styles.padded}>
            <StatusPicker value={entry?.status} onChange={(s) => setStatus(pickSummary(anime), s)} />
          </View>
        </Section>

        {entry ? (
          <Section title="Your rating">
            <View style={[styles.padded, styles.center]}>
              <RatingStars value={entry.rating} onChange={(r) => setRating(id, r)} size={34} />
            </View>
          </Section>
        ) : null}

        {details?.description ? (
          <Section title="Story">
            <Pressable onPress={() => setExpanded((v) => !v)} accessibilityRole="button" style={styles.padded}>
              <Text style={[Type.body, { color: colors.text }]} numberOfLines={expanded ? undefined : 5}>
                {details.description}
              </Text>
              <Text style={[Type.subhead, styles.more, { color: accent }]}>{expanded ? 'Show less' : 'Read more'}</Text>
            </Pressable>
          </Section>
        ) : null}

        {details?.characters.length ? (
          <Section title="Cast">
            <CharacterRow characters={details.characters} />
          </Section>
        ) : null}

        {entry ? (
          <View style={[styles.center, styles.remove]}>
            <ActionButton title="Remove from Library" sf="trash" md="delete" variant="destructive" onPress={confirmRemove} />
          </View>
        ) : null}
      </Animated.ScrollView>
    </View>
  );
}

function Section({ title, accessory, children }: PropsWithChildren<{ title: string; accessory?: React.ReactNode }>) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
          {title}
        </Text>
        {accessory}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  loading: { justifyContent: 'center' },
  banner: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  glow: { position: 'absolute', left: 0, right: 0 },
  hero: { flexDirection: 'row', alignItems: 'flex-end', gap: 16, paddingHorizontal: 20 },
  poster: { borderRadius: 12, boxShadow: '0 14px 34px rgba(0,0,0,0.35)' },
  heroText: { flex: 1, gap: 4, paddingBottom: 4 },
  title: { fontFamily: Fonts.display, fontSize: 30, lineHeight: 33, letterSpacing: -0.8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, marginTop: 18 },
  score: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  scoreText: { fontFamily: Fonts.heading, fontSize: 14 },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginTop: 14 },
  genre: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  primary: {
    marginHorizontal: 20,
    marginTop: 20,
    minHeight: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryLabel: { ...Type.headline, fontWeight: '700' },
  done: {
    marginHorizontal: 20,
    marginTop: 20,
    minHeight: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  section: { marginTop: 32, gap: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 20 },
  sectionTitle: { fontFamily: Fonts.display, fontSize: 22, letterSpacing: -0.5 },
  padded: { paddingHorizontal: 20 },
  center: { alignItems: 'center' },
  more: { marginTop: 8, fontWeight: '700' },
  remove: { marginTop: 36 },
});

