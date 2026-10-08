import { Link } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { PlatformPressable } from '@/components/motion';
import { Poster } from '@/components/poster';
import { EpisodeBar } from '@/components/progress';
import { useAnimeHref } from '@/components/tab-context';
import { isCaughtUp, isComplete, nextEpisodeLabel } from '@/lib/airing';
import { mediaLabel, unitsOf } from '@/lib/anilist';
import { readableOn, showAccent, withAlpha } from '@/lib/color';
import { type LibraryEntry, useLibrary } from '@/store/library';
import { useAppTheme } from '@/theme/theme';
import { Type } from '@/theme/type';

/** Up-next card: poster, title, progress and a +1 button, tinted in the title's colour. */
export const ContinueCard = memo(function ContinueCard({
  entry,
  width,
  onLongPress,
}: {
  entry: LibraryEntry;
  width: number;
  onLongPress?: () => void;
}) {
  const { colors } = useAppTheme();
  const href = useAnimeHref();
  const increment = useLibrary((s) => s.incrementProgress);
  const accent = showAccent(entry.coverColor, colors.primary);
  const onAccent = readableOn(accent);
  const units = unitsOf(entry);
  const done = isComplete(entry, entry.progress);
  const caughtUp = isCaughtUp(entry, entry.progress);
  const kind = mediaLabel(entry);

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
        <PlatformPressable
          accessibilityRole="button"
          accessibilityLabel={entry.title}
          onLongPress={onLongPress}
          delayLongPress={350}
          style={styles.main}>
          <Poster uri={entry.coverUrl} color={entry.coverColor} width={78} />
          <View style={styles.body}>
            {kind ? (
              <Text style={[Type.caption, styles.kind, { color: accent }]} numberOfLines={1}>
                {kind.toUpperCase()}
              </Text>
            ) : null}
            <Text style={[Type.headline, { color: colors.text }]} numberOfLines={2}>
              {entry.title}
            </Text>
            <Text style={[Type.footnote, { color: colors.textSecondary }]}>
              {entry.progress === 0
                ? 'Not started'
                : `${units.one} ${entry.progress}${entry.episodes ? ` of ${entry.episodes}` : ''}`}
            </Text>
            <EpisodeBar progress={entry.progress} total={entry.episodes} color={accent} height={5} />
          </View>
        </PlatformPressable>
      </Link>
      {done ? null : caughtUp ? (
        <View style={[styles.plusOne, { backgroundColor: withAlpha(accent, 0.16) }]}>
          <Icon sf="calendar" md="event" size={14} color={accent} />
          <Text style={[Type.footnote, styles.plusOneLabel, { color: colors.text }]}>{nextEpisodeLabel(entry)}</Text>
        </View>
      ) : (
        <PlatformPressable
          haptic
          onPress={() => increment(entry.id)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Mark ${units.one.toLowerCase()} ${entry.progress + 1} of ${entry.title} as ${units.done.toLowerCase()}`}
          style={[styles.plusOne, { backgroundColor: accent }]}>
          <Icon sf="plus" md="add" size={14} color={onAccent} />
          <Text style={[Type.footnote, styles.plusOneLabel, { color: onAccent }]}>
            {units.one} {entry.progress + 1}
          </Text>
        </PlatformPressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: 12,
    gap: 12,
    overflow: 'hidden',
  },
  main: { flexDirection: 'row', gap: 14 },
  body: { flex: 1, gap: 6, justifyContent: 'center' },
  kind: { fontWeight: '800', letterSpacing: 0.8 },
  plusOne: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    borderRadius: 20,
  },
  plusOneLabel: { fontWeight: '700' },
});
