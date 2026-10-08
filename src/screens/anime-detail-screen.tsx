import { Stack, router } from 'expo-router';
import { type PropsWithChildren, useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { ActionButton, EpisodeStepper, StatusPicker } from '@/components/controls';
import { CharacterRow } from '@/components/character-row';
import { AmbientBackdrop } from '@/components/motion';
import { Poster } from '@/components/poster';
import { RatingStars } from '@/components/rating-stars';
import { ErrorState, LoadingState } from '@/components/states';
import { LISTS } from '@/constants/lists';
import { type AnimeSummary, describeAnime, getAnime, pickSummary } from '@/lib/anilist';
import { useRequest } from '@/lib/use-request';
import { useEntry, useLibrary } from '@/store/library';
import { Fonts } from '@/theme/fonts';
import { useAppTheme } from '@/theme/theme';

export function AnimeDetailScreen({ id }: { id: number }) {
  const { colors } = useAppTheme();
  const entry = useEntry(id);
  const { setStatus, setProgress, setRating, remove } = useLibrary.getState();
  const fetcher = useCallback((signal: AbortSignal) => getAnime(id, signal), [id]);
  const { data: details, error, retry } = useRequest(`anime:${id}`, fetcher);
  const [expanded, setExpanded] = useState(false);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  // The blurred backdrop drifts slower than the content and stretches on overscroll.
  const parallax = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [-200, 0, 400], [0, 0, -160], 'clamp') },
      { scale: interpolate(scrollY.value, [-200, 0], [1.25, 1], 'clamp') },
    ],
  }));

  // Library entries render instantly (and offline); details fill in when loaded.
  const anime: AnimeSummary | undefined = details ?? entry;

  if (!anime) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: '' }} />
        {error ? <ErrorState error={error} onRetry={retry} /> : <LoadingState />}
      </View>
    );
  }

  const confirmRemove = () =>
    Alert.alert('Remove from library?', `${anime.title} will be removed from your lists.`, [
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

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.backdrop, parallax]} pointerEvents="none">
        <AmbientBackdrop
          uri={details?.bannerUrl ?? anime.coverUrl}
          color={anime.coverColor}
          height={460}
        />
      </Animated.View>
      <Animated.ScrollView
        style={styles.fill}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}>
        <Stack.Screen options={{ title: anime.title }} />

        <Animated.View entering={FadeInDown.duration(500)} style={styles.hero}>
          <Poster uri={anime.coverUrl} color={anime.coverColor} width={124} shadow />
          <View style={styles.heroText}>
            <Text style={[styles.title, { color: colors.text }]} selectable>
              {anime.title}
            </Text>
            {details?.nativeTitle ? (
              <Text style={[styles.subtle, { color: colors.textSecondary }]}>{details.nativeTitle}</Text>
            ) : null}
            <Text style={[styles.subtle, { color: colors.textSecondary }]}>{describeAnime(anime)}</Text>
            {details?.studios.length ? (
              <Text style={[styles.subtle, { color: colors.textSecondary }]}>
                {details.studios.join(', ')}
              </Text>
            ) : null}
            {anime.averageScore ? (
              <Text style={[styles.score, { color: colors.text }]}>
                ★ {(anime.averageScore / 10).toFixed(1)}
                <Text style={[styles.subtle, { color: colors.textSecondary }]}> AniList</Text>
              </Text>
            ) : null}
          </View>
        </Animated.View>

        <Section title={entry ? `In ${LISTS[entry.status].title}` : 'Add to a list'}>
          <StatusPicker value={entry?.status} onChange={(s) => setStatus(pickSummary(anime), s)} />
        </Section>

        {entry ? (
          <>
            <Section title="Progress">
              <EpisodeStepper
                progress={entry.progress}
                episodes={entry.episodes}
                onChange={(n) => setProgress(id, n)}
              />
            </Section>
            <Section title="Your rating">
              <View style={styles.center}>
                <RatingStars value={entry.rating} onChange={(r) => setRating(id, r)} size={34} />
              </View>
            </Section>
          </>
        ) : null}

        {details?.characters.length ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Characters</Text>
          <View style={styles.bleed}>
            <CharacterRow characters={details.characters} />
          </View>
        </View>
      ) : null}

      {details?.genres.length ? (
          <View style={styles.genres}>
            {details.genres.map((g) => (
              <View key={g} style={[styles.genre, { backgroundColor: colors.fill }]}>
                <Text style={[styles.genreText, { color: colors.text }]}>{g}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {details?.description ? (
          <Section title="Synopsis">
            <Pressable onPress={() => setExpanded((v) => !v)} accessibilityRole="button">
              <Text
                style={[styles.body, { color: colors.text }]}
                numberOfLines={expanded ? undefined : 6}>
                {details.description}
              </Text>
              <Text style={[styles.more, { color: colors.primary }]}>
                {expanded ? 'Show less' : 'Show more'}
              </Text>
            </Pressable>
          </Section>
        ) : null}

        {entry ? (
          <View style={styles.center}>
            <ActionButton
              title="Remove from Library"
              sf="trash"
              md="delete"
              variant="destructive"
              onPress={confirmRemove}
            />
          </View>
        ) : null}
      </Animated.ScrollView>
    </View>
  );
}

function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {title}
      </Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, height: 460 },
  content: { padding: 16, paddingBottom: 48, gap: 20 },
  hero: { flexDirection: 'row', gap: 16 },
  heroText: { flex: 1, gap: 4, justifyContent: 'flex-end' },
  title: { fontFamily: Fonts.display, fontSize: 24, lineHeight: 28 },
  subtle: { fontFamily: Fonts.label, fontSize: 14 },
  score: { fontFamily: Fonts.display, fontSize: 18, marginTop: 4 },
  section: { gap: 8 },
  sectionTitle: { fontFamily: Fonts.heading, fontSize: 15, marginLeft: 6 },
  card: {
    padding: 16,
    borderRadius: 24,
    borderCurve: 'continuous',
  },
  center: { alignItems: 'center' },
  bleed: { marginHorizontal: -16 },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genre: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  genreText: { fontFamily: Fonts.heading, fontSize: 13 },
  body: { fontSize: 15, lineHeight: 22 },
  more: { fontFamily: Fonts.heading, fontSize: 15, marginTop: 8 },
});
