import * as Haptics from 'expo-haptics';
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { type AnimeSummary } from '@/lib/anilist';
import {
  cadenceLabel,
  type ChapterData,
  type ChapterTarget,
  formatExpected,
  formatReleased,
  getChapters,
  isNew,
} from '@/lib/chapters';
import { readableOn, withAlpha } from '@/lib/color';
import { useRequest } from '@/lib/use-request';
import { useAppTheme } from '@/theme/theme';
import { Type } from '@/theme/type';

export function chapterTarget(
  a: Pick<AnimeSummary, 'id' | 'title' | 'country' | 'year' | 'airingStatus'>,
  titles?: string[]
): ChapterTarget {
  return {
    id: a.id,
    titles: titles?.length ? titles : [a.title],
    country: a.country,
    year: a.year,
    finished: a.airingStatus === 'FINISHED' || a.airingStatus === 'CANCELLED',
  };
}

/** Release history for a series; `null` target skips the request. */
export function useChapters(target: ChapterTarget | null) {
  const key = target ? `chapters:${target.id}` : null;
  const fetcher = useCallback(
    (signal: AbortSignal) => (target ? getChapters(target, signal) : Promise.resolve(null)),
    // The key captures everything the request depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );
  return useRequest<ChapterData | null>(key, fetcher);
}

/** Total chapters to list: the most we know of from any source. */
export function chapterCount(data: ChapterData | null | undefined, total: number | null, progress = 0) {
  return Math.max(total ?? 0, data?.latest ?? 0, progress);
}

/** "Chapter 223 expected in 6 days" with the series' release rhythm. */
export function ReleaseBanner({ data, accent }: { data: ChapterData; accent: string }) {
  const { colors } = useAppTheme();
  if (data.latest == null) return null;
  const expecting = data.nextExpectedAt != null;
  const title = expecting
    ? `Chapter ${data.latest + 1} expected ${formatExpected(data.nextExpectedAt!)}`
    : `Latest: Chapter ${data.latest}`;
  const detail = [
    data.cadenceDays && expecting ? cadenceLabel(data.cadenceDays) : null,
    expecting ? `Ch ${data.latest} out ${formatReleased(data.latestAt!).toLowerCase()}` : formatReleased(data.latestAt!),
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <View
      style={[
        styles.banner,
        {
          borderColor: withAlpha(accent, 0.35),
          backgroundColor: colors.surface,
          experimental_backgroundImage: `linear-gradient(120deg, ${withAlpha(accent, 0.28)} 0%, ${withAlpha(accent, 0.06)} 100%)`,
        },
      ]}
      accessible
      accessibilityLabel={`${title}. ${detail}`}>
      <View style={[styles.bannerIcon, { backgroundColor: accent }]}>
        <Icon sf={expecting ? 'calendar.badge.clock' : 'book.closed.fill'} md={expecting ? 'event_upcoming' : 'menu_book'} size={18} color={readableOn(accent)} />
      </View>
      <View style={styles.bannerText}>
        <Text style={[Type.headline, { color: colors.text }]}>{title}</Text>
        <Text style={[Type.footnote, { color: colors.textSecondary }]}>{detail}</Text>
      </View>
    </View>
  );
}

type RowProps = {
  number: number;
  releasedAt: number | undefined;
  read: boolean;
  accent: string;
  /** Marks this chapter (and everything before it) as read; absent when not in the library. */
  onPress?: (n: number) => void;
};

export const ChapterRow = memo(function ChapterRow({ number, releasedAt, read, accent, onPress }: RowProps) {
  const { colors } = useAppTheme();
  const fresh = !read && releasedAt != null && isNew(releasedAt);
  return (
    <Pressable
      disabled={!onPress}
      onPress={() => {
        Haptics.selectionAsync();
        onPress?.(number);
      }}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`Chapter ${number}${releasedAt ? `, released ${formatReleased(releasedAt)}` : ''}${read ? ', read' : ''}`}
      accessibilityHint={onPress ? (read ? 'Marks as unread' : 'Marks this and earlier chapters as read') : undefined}
      style={({ pressed }) => [styles.row, { borderBottomColor: colors.separator, opacity: pressed ? 0.6 : 1 }]}>
      <View style={styles.rowText}>
        <Text style={[Type.body, styles.rowTitle, { color: read ? colors.textSecondary : colors.text }]}>
          Chapter {number}
        </Text>
        <Text style={[Type.footnote, { color: colors.textSecondary }]}>
          {releasedAt ? formatReleased(releasedAt) : 'Release date unknown'}
        </Text>
      </View>
      {fresh ? (
        <View style={[styles.newBadge, { backgroundColor: accent }]}>
          <Text style={[styles.newLabel, { color: readableOn(accent) }]}>NEW</Text>
        </View>
      ) : null}
      {onPress ? (
        <Icon
          sf={read ? 'checkmark.circle.fill' : 'circle'}
          md={read ? 'check_circle' : 'radio_button_unchecked'}
          size={24}
          color={read ? accent : (colors.separator as string)}
        />
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  bannerIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  bannerText: { flex: 1, gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontWeight: '600' },
  newBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  newLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
});
