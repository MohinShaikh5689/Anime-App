import { Link } from 'expo-router';
import { memo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { IncrementButton, Progress } from '@/components/controls';
import { Poster } from '@/components/poster';
import { RatingStars } from '@/components/rating-stars';
import { useAnimeHref } from '@/components/tab-context';
import { describeAnime } from '@/lib/anilist';
import { type LibraryEntry, useLibrary } from '@/store/library';
import { useAppTheme } from '@/theme/theme';

const isIOS = Platform.OS === 'ios';

function RowShell({ id, children }: { id: number; children: React.ReactNode }) {
  const { colors } = useAppTheme();
  const href = useAnimeHref();
  return (
    <Link href={href(id)} asChild>
      <Pressable
        android_ripple={{ color: colors.fill as string }}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: colors.surface },
          isIOS && pressed && { opacity: 0.6 },
        ]}>
        {children}
      </Pressable>
    </Link>
  );
}

export const EntryRow = memo(function EntryRow({ entry }: { entry: LibraryEntry }) {
  const { colors } = useAppTheme();
  const increment = useLibrary((s) => s.incrementProgress);
  const canIncrement =
    entry.status === 'watching' && (entry.episodes == null || entry.progress < entry.episodes);
  const showProgress = entry.status === 'watching' || entry.status === 'dropped';

  return (
    <RowShell id={entry.id}>
      <Poster uri={entry.coverUrl} color={entry.coverColor} width={64} />
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {entry.title}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
          {describeAnime(entry)}
        </Text>
        {showProgress ? (
          <View style={styles.progress}>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              Episode {entry.progress}
              {entry.episodes ? ` of ${entry.episodes}` : ''}
            </Text>
            <Progress
              value={entry.progress}
              total={entry.episodes}
              color={colors.status[entry.status]}
            />
          </View>
        ) : entry.status === 'watched' ? (
          <View style={styles.progress}>
            <RatingStars value={entry.rating} size={14} />
          </View>
        ) : null}
      </View>
      {canIncrement ? (
        <IncrementButton
          onPress={() => increment(entry.id)}
          accessibilityLabel={`Mark episode ${entry.progress + 1} of ${entry.title} as watched`}
        />
      ) : null}
    </RowShell>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginHorizontal: 16,
    borderRadius: isIOS ? 16 : 20,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  body: { flex: 1, gap: 2 },
  title: { fontSize: isIOS ? 17 : 16, fontWeight: '600' },
  meta: { fontSize: isIOS ? 13 : 14 },
  progress: { marginTop: 6, gap: 4 },
});
