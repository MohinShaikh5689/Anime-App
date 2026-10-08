import { Stack, router } from 'expo-router';
import { type PropsWithChildren, useCallback, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton, EpisodeStepper, StatusPicker } from '@/components/controls';
import { Poster } from '@/components/poster';
import { RatingStars } from '@/components/rating-stars';
import { ErrorState, LoadingState } from '@/components/states';
import { LISTS } from '@/constants/lists';
import { type AnimeSummary, describeAnime, getAnime, pickSummary } from '@/lib/anilist';
import { useRequest } from '@/lib/use-request';
import { useEntry, useLibrary } from '@/store/library';
import { useAppTheme } from '@/theme/theme';

const isIOS = Platform.OS === 'ios';

export function AnimeDetailScreen({ id }: { id: number }) {
  const { colors } = useAppTheme();
  const entry = useEntry(id);
  const { setStatus, setProgress, setRating, remove } = useLibrary.getState();
  const fetcher = useCallback((signal: AbortSignal) => getAnime(id, signal), [id]);
  const { data: details, error, retry } = useRequest(`anime:${id}`, fetcher);
  const [expanded, setExpanded] = useState(false);

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
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: anime.title }} />

      <View style={styles.hero}>
        <Poster uri={anime.coverUrl} color={anime.coverColor} width={120} />
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
      </View>

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
    </ScrollView>
  );
}

function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {isIOS ? title.toUpperCase() : title}
      </Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: 16, paddingBottom: 48, gap: 20 },
  hero: { flexDirection: 'row', gap: 16 },
  heroText: { flex: 1, gap: 4, justifyContent: 'flex-end' },
  title: { fontSize: isIOS ? 22 : 24, fontWeight: '700' },
  subtle: { fontSize: 14 },
  score: { fontSize: 17, fontWeight: '600', marginTop: 4 },
  section: { gap: 8 },
  sectionTitle: isIOS
    ? { fontSize: 13, marginLeft: 16 }
    : { fontSize: 14, fontWeight: '500', marginLeft: 4 },
  card: {
    padding: 16,
    borderRadius: isIOS ? 20 : 24,
    borderCurve: 'continuous',
  },
  center: { alignItems: 'center' },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genre: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: isIOS ? 14 : 8 },
  genreText: { fontSize: 13, fontWeight: '500' },
  body: { fontSize: 15, lineHeight: 22 },
  more: { fontSize: 15, fontWeight: '600', marginTop: 8 },
});
