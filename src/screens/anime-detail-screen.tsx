import { Stack, router } from 'expo-router';
import { type PropsWithChildren, useCallback, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CharacterRow } from '@/components/character-row';
import { ActionButton, EpisodeStepper, StatusPicker } from '@/components/controls';
import { EpisodeReadout, FrameSheet } from '@/components/frames';
import { Poster } from '@/components/poster';
import { RatingStars } from '@/components/rating-stars';
import { ErrorState, LoadingState } from '@/components/states';
import { LISTS } from '@/constants/lists';
import { type AnimeSummary, describeAnime, getAnime, pickSummary } from '@/lib/anilist';
import { useRequest } from '@/lib/use-request';
import { useEntry, useLibrary } from '@/store/library';
import { Fonts } from '@/theme/fonts';
import { useAppTheme } from '@/theme/theme';
import { Type } from '@/theme/type';

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

  const facts = [
    describeAnime(anime),
    details?.studios.length ? details.studios.join(', ') : null,
  ].filter(Boolean);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: anime.title }} />

      <View style={styles.hero}>
        <Poster uri={anime.coverUrl} color={anime.coverColor} width={116} />
        <View style={styles.heroText}>
          <Text style={[Type.title2, { color: colors.text }]} selectable>
            {anime.title}
          </Text>
          {details?.nativeTitle ? (
            <Text style={[Type.subhead, { color: colors.textSecondary }]}>{details.nativeTitle}</Text>
          ) : null}
          {facts.map((f) => (
            <Text key={f} style={[Type.footnote, { color: colors.textSecondary }]}>
              {f}
            </Text>
          ))}
          {anime.averageScore ? (
            <Text style={[styles.score, { color: colors.text }]}>
              {(anime.averageScore / 10).toFixed(1)}
              <Text style={[Type.footnote, { color: colors.textSecondary }]}> / 10 on AniList</Text>
            </Text>
          ) : null}
        </View>
      </View>

      <Section title={entry ? `In ${LISTS[entry.status].title}` : 'Add to a list'}>
        <StatusPicker value={entry?.status} onChange={(s) => setStatus(pickSummary(anime), s)} />
      </Section>

      {entry ? (
        <Section
          title="Episodes"
          accessory={<EpisodeReadout progress={entry.progress} total={entry.episodes} size={17} />}>
          {entry.episodes ? (
            <FrameSheet progress={entry.progress} total={entry.episodes} onSet={(n) => setProgress(id, n)} />
          ) : (
            <EpisodeStepper progress={entry.progress} episodes={null} onChange={(n) => setProgress(id, n)} />
          )}
        </Section>
      ) : null}

      {entry ? (
        <Section title="Your rating">
          <View style={styles.center}>
            <RatingStars value={entry.rating} onChange={(r) => setRating(id, r)} size={32} />
          </View>
        </Section>
      ) : null}

      {details?.characters.length ? (
        <View style={styles.section}>
          <SectionTitle title="Characters" />
          <View style={styles.bleed}>
            <CharacterRow characters={details.characters} />
          </View>
        </View>
      ) : null}

      {details?.description ? (
        <Section title="Synopsis">
          <Pressable onPress={() => setExpanded((v) => !v)} accessibilityRole="button">
            <Text style={[Type.body, { color: colors.text }]} numberOfLines={expanded ? undefined : 6}>
              {details.description}
            </Text>
            <Text style={[Type.subhead, styles.more, { color: colors.primary }]}>
              {expanded ? 'Show less' : 'Show more'}
            </Text>
          </Pressable>
          {details.genres.length ? (
            <Text style={[Type.footnote, styles.genres, { color: colors.textSecondary }]}>
              {details.genres.join(' · ')}
            </Text>
          ) : null}
        </Section>
      ) : null}

      {entry ? (
        <View style={styles.center}>
          <ActionButton title="Remove from Library" sf="trash" md="delete" variant="destructive" onPress={confirmRemove} />
        </View>
      ) : null}
    </ScrollView>
  );
}

function SectionTitle({ title, accessory }: { title: string; accessory?: React.ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.sectionHeader, { borderBottomColor: colors.rule as string }]}>
      <Text style={[Type.headline, { color: colors.text }]} accessibilityRole="header">
        {title}
      </Text>
      {accessory}
    </View>
  );
}

function Section({ title, accessory, children }: PropsWithChildren<{ title: string; accessory?: React.ReactNode }>) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.section}>
      <SectionTitle title={title} accessory={accessory} />
      <View style={[styles.card, { backgroundColor: colors.surface }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: 16, paddingBottom: 48, gap: 28 },
  hero: { flexDirection: 'row', gap: 16, alignItems: 'flex-end' },
  heroText: { flex: 1, gap: 4 },
  score: { fontFamily: Fonts.numeral, fontSize: 22, fontVariant: ['tabular-nums'], marginTop: 6 },
  section: { gap: 10 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  card: { padding: 16, borderRadius: isIOS ? 14 : 20, borderCurve: 'continuous' },
  center: { alignItems: 'center' },
  bleed: { marginHorizontal: -16 },
  more: { marginTop: 8, fontWeight: '600' },
  genres: { marginTop: 12 },
});
