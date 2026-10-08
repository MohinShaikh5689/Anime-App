import { Stack, router } from 'expo-router';
import { type PropsWithChildren, useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CharacterRow } from '@/components/character-row';
import { ActionButton, StatusPicker } from '@/components/controls';
import { Icon } from '@/components/icon';
import { PlatformPressable } from '@/components/motion';
import { Art } from '@/components/poster';
import { EpisodeTiles } from '@/components/progress';
import { RatingStars } from '@/components/rating-stars';
import { AnimeShelf } from '@/components/shelf';
import { ErrorState, LoadingState } from '@/components/states';
import { airedCount, isUnaired, maxProgress, nextEpisodeLabel, premiereLabel, statusBlock } from '@/lib/airing';
import { type AnimeSummary, formatLabel, getAnime, getRecommendations, pickSummary } from '@/lib/anilist';
import { readableOn, showAccent, withAlpha } from '@/lib/color';
import { useRequest } from '@/lib/use-request';
import { useEntry, useLibrary } from '@/store/library';
import { Fonts } from '@/theme/fonts';
import { useAppTheme } from '@/theme/theme';
import { Type } from '@/theme/type';

const STATUS_LABELS: Record<string, string> = {
  FINISHED: 'Finished airing',
  RELEASING: 'Airing now',
  NOT_YET_RELEASED: 'Not yet aired',
  CANCELLED: 'Cancelled',
  HIATUS: 'On hiatus',
};

function titleSize(title: string) {
  if (title.length > 44) return 24;
  if (title.length > 28) return 28;
  if (title.length > 16) return 32;
  return 38;
}

export function AnimeDetailScreen({ id }: { id: number }) {
  const { colors, canvas } = useAppTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const entry = useEntry(id);
  const { setStatus, setProgress, setRating, remove, incrementProgress } = useLibrary.getState();
  const fetcher = useCallback((signal: AbortSignal) => getAnime(id, signal), [id]);
  const { data: details, error, retry } = useRequest(`anime:${id}`, fetcher);
  const fetchRecs = useCallback((signal: AbortSignal) => getRecommendations(id, signal), [id]);
  const recs = useRequest(`recs:${id}`, fetchRecs);
  const [expanded, setExpanded] = useState(false);

  // Fresh details carry the latest airing state; keep the saved entry current.
  const hasEntry = entry != null;
  useEffect(() => {
    if (details && hasEntry) useLibrary.getState().updateMeta([pickSummary(details)]);
  }, [details, hasEntry]);

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
  const artHeight = Math.round(Math.min(width * 1.3, 620));
  const size = titleSize(anime.title);

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

  const live = details ? pickSummary(details) : anime;
  const unaired = isUnaired(live);
  const blocked = {
    watching: statusBlock(live, 'watching'),
    watched: statusBlock(live, 'watched'),
  };

  const primary = !entry
    ? {
        label: 'Add to Wishlist',
        sf: 'plus' as const,
        md: 'add' as const,
        run: () => setStatus(pickSummary(anime), 'wishlist'),
      }
    : entry.status === 'wishlist' && !unaired
      ? {
          label: 'Start Watching',
          sf: 'play.fill' as const,
          md: 'play_arrow' as const,
          run: () => setStatus(pickSummary(anime), 'watching'),
        }
      : entry.status === 'watching' && entry.progress < maxProgress(live)
        ? {
            label: `Log Episode ${entry.progress + 1}`,
            sf: 'checkmark' as const,
            md: 'check' as const,
            run: () => incrementProgress(id),
          }
        : null;

  const meta = [formatLabel(anime.format), anime.year, anime.episodes ? `${anime.episodes} episodes` : null].filter(
    Boolean
  );

  const info = [
    details?.status ? { label: 'Status', value: STATUS_LABELS[details.status] ?? details.status } : null,
    details?.season && anime.year
      ? { label: 'Season', value: `${details.season[0]}${details.season.slice(1).toLowerCase()} ${anime.year}` }
      : null,
    anime.episodes ? { label: 'Episodes', value: String(anime.episodes) } : null,
    details?.duration ? { label: 'Episode length', value: `${details.duration} min` } : null,
    details?.studios.length ? { label: 'Studio', value: details.studios.join(', ') } : null,
    anime.format ? { label: 'Format', value: formatLabel(anime.format) ?? anime.format } : null,
  ].filter((r): r is { label: string; value: string } => r != null);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      bounces={false}
      overScrollMode="never"
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>
      <Stack.Screen options={{ title: '' }} />

      <View style={{ height: artHeight }}>
        <Art uri={anime.coverUrl} color={anime.coverColor} style={StyleSheet.absoluteFill} contentPosition="top" />
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              experimental_backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 18%, ${withAlpha(canvas, 0)} 42%, ${withAlpha(canvas, 0.82)} 74%, ${canvas} 100%)`,
            },
          ]}
        />
        <View style={styles.heroBody}>
          <Text
            style={[styles.title, { color: colors.text, fontSize: size, lineHeight: size + 4 }]}
            numberOfLines={3}
            selectable>
            {anime.title}
          </Text>
          {details?.nativeTitle ? (
            <Text style={[Type.footnote, styles.centered, { color: colors.textSecondary }]} numberOfLines={1}>
              {details.nativeTitle}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            {anime.averageScore ? (
              <View
                style={[styles.score, { backgroundColor: withAlpha(accent, 0.18), borderColor: withAlpha(accent, 0.5) }]}>
                <Icon sf="star.fill" md="star" size={12} color={accent} />
                <Text style={[styles.scoreText, { color: colors.text }]}>{anime.averageScore}%</Text>
              </View>
            ) : null}
            <Text style={[Type.subhead, { color: colors.textSecondary }]} numberOfLines={1}>
              {meta.join('  ·  ')}
            </Text>
          </View>
        </View>
      </View>

      {/* A soft wash of the show's colour; starts transparent so there's no seam. */}
      <View
        pointerEvents="none"
        style={[
          styles.wash,
          {
            top: artHeight * 0.75,
            experimental_backgroundImage: `linear-gradient(to bottom, ${withAlpha(accent, 0)} 0%, ${withAlpha(accent, 0.14)} 30%, ${withAlpha(canvas, 0)} 100%)`,
          },
        ]}
      />

      {details?.genres.length ? (
        <View style={styles.genres}>
          {details.genres.slice(0, 4).map((g) => (
            <Text key={g} style={[Type.footnote, styles.genre, { color: colors.text, backgroundColor: colors.fill }]}>
              {g}
            </Text>
          ))}
        </View>
      ) : null}

      {primary ? (
        <PlatformPressable
          haptic
          onPress={primary.run}
          accessibilityRole="button"
          style={[styles.primary, { backgroundColor: accent, boxShadow: `0 12px 30px ${withAlpha(accent, 0.35)}` }]}>
          <Icon sf={primary.sf} md={primary.md} size={18} color={onAccent} />
          <Text style={[styles.primaryLabel, { color: onAccent }]}>{primary.label}</Text>
        </PlatformPressable>
      ) : entry?.status === 'watched' ? (
        <View style={[styles.primary, { backgroundColor: withAlpha(accent, 0.16) }]}>
          <Icon sf="checkmark.seal.fill" md="verified" size={20} color={accent} />
          <Text style={[styles.primaryLabel, { color: colors.text }]}>You finished this</Text>
        </View>
      ) : entry && (unaired || entry.status === 'watching') ? (
        <View style={[styles.primary, { backgroundColor: withAlpha(accent, 0.16) }]}>
          <Icon sf="calendar" md="event" size={20} color={accent} />
          <Text style={[styles.primaryLabel, { color: colors.text }]}>
            {unaired ? premiereLabel(live) : live.nextAiringAt ? `Caught up · ${nextEpisodeLabel(live)}` : "You're caught up"}
          </Text>
        </View>
      ) : null}

      {entry && !unaired ? (
        <Section
          title="Episodes"
          accessory={
            <Text style={[Type.subhead, { color: colors.textSecondary }]}>
              {entry.progress}
              {entry.episodes ? ` of ${entry.episodes} watched` : ' watched'}
            </Text>
          }>
          <EpisodeTiles
            progress={entry.progress}
            total={entry.episodes}
            aired={airedCount(live)}
            color={accent}
            onSet={(n) => setProgress(id, n)}
          />
        </Section>
      ) : null}

      <Section title={entry ? 'Your list' : 'Add to a list'}>
        <View style={styles.padded}>
          <StatusPicker
            value={entry?.status}
            onChange={(s) => setStatus(pickSummary(live), s)}
            color={accent}
            blocked={blocked}
          />
        </View>
      </Section>

      {entry ? (
        <Section title="Your rating">
          <View style={[styles.padded, styles.center]}>
            <RatingStars value={entry.rating} onChange={(r) => setRating(id, r)} size={34} color={accent} />
          </View>
        </Section>
      ) : null}

      {details?.description ? (
        <Section title="Story">
          <Pressable onPress={() => setExpanded((v) => !v)} accessibilityRole="button" style={styles.padded}>
            <Text style={[Type.body, styles.story, { color: colors.text }]} numberOfLines={expanded ? undefined : 5}>
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

      {info.length ? (
        <Section title="Info">
          <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            {info.map((row, i) => (
              <View
                key={row.label}
                style={[
                  styles.infoRow,
                  i > 0 && { borderTopColor: colors.separator as string, borderTopWidth: StyleSheet.hairlineWidth },
                ]}>
                <Text style={[Type.subhead, { color: colors.textSecondary }]}>{row.label}</Text>
                <Text style={[Type.subhead, styles.infoValue, { color: colors.text }]} numberOfLines={2}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      <View style={styles.recs}>
        <AnimeShelf title="More Like This" data={recs.data} error={recs.error} onRetry={recs.retry} />
      </View>

      {entry ? (
        <View style={[styles.center, styles.remove]}>
          <ActionButton title="Remove from Library" sf="trash" md="delete" variant="destructive" onPress={confirmRemove} />
        </View>
      ) : null}
    </ScrollView>
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
  loading: { justifyContent: 'center' },
  heroBody: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 4,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 6,
  },
  title: { fontFamily: Fonts.display, textAlign: 'center' },
  centered: { textAlign: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  score: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  scoreText: { fontFamily: Fonts.heading, fontSize: 13 },
  wash: { position: 'absolute', left: 0, right: 0, height: 520 },
  genres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 14,
  },
  genre: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, overflow: 'hidden' },
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
  section: { marginTop: 34, gap: 14 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
  },
  sectionTitle: { fontFamily: Fonts.display, fontSize: 22 },
  padded: { paddingHorizontal: 20 },
  center: { alignItems: 'center' },
  story: { lineHeight: 24 },
  more: { marginTop: 8, fontWeight: '700' },
  infoCard: { marginHorizontal: 20, borderRadius: 16, borderCurve: 'continuous', paddingHorizontal: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, paddingVertical: 12 },
  infoValue: { flexShrink: 1, textAlign: 'right', fontWeight: '600' },
  recs: { marginTop: 34 },
  remove: { marginTop: 36 },
});
