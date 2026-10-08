import { type Href, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContinueCard } from '@/components/continue-card';
import { Icon } from '@/components/icon';
import { PlatformPressable } from '@/components/motion';
import { PosterCard } from '@/components/poster-card';
import { EmptyState } from '@/components/states';
import { LIST_STATUSES, type ListStatus, listMeta } from '@/constants/lists';
import { isUnaired, maxProgress, nextEpisodeLabel, premiereLabel, statusBlock } from '@/lib/airing';
import { isManga, kindOf, type MediaKind, mediaLabel, unitsOf } from '@/lib/anilist';
import { readableOn, showAccent, withAlpha } from '@/lib/color';
import { GRID_GAP, GRID_PADDING, useGrid } from '@/lib/use-grid';
import { type LibraryEntry, useLibrary } from '@/store/library';
import { useUi } from '@/store/ui';
import { Fonts } from '@/theme/fonts';
import { useAppTheme } from '@/theme/theme';
import { Type } from '@/theme/type';

const KINDS: { kind: MediaKind; label: string }[] = [
  { kind: 'anime', label: 'Anime' },
  { kind: 'manga', label: 'Manga' },
  { kind: 'manhwa', label: 'Manhwa' },
];

function subtitleFor(e: LibraryEntry) {
  const units = unitsOf(e);
  switch (e.status) {
    case 'watching':
      return e.progress >= maxProgress(e)
        ? nextEpisodeLabel(e)
        : `${units.short} ${e.progress}${e.episodes ? ` of ${e.episodes}` : ''}`;
    case 'wishlist':
      if (isUnaired(e)) return premiereLabel(e);
      return [mediaLabel(e), e.episodes ? `${e.episodes} ${units.many}` : e.year].filter(Boolean).join(' · ');
    case 'watched':
      return e.rating ? `${'★'.repeat(e.rating)}${'☆'.repeat(5 - e.rating)}` : 'Not rated yet';
    case 'dropped':
      return e.progress ? `Stopped at ${units.short.toLowerCase()} ${e.progress}` : 'Dropped';
  }
}

/** Long-press menu: move a title to another list or remove it. */
function showQuickActions(entry: LibraryEntry) {
  const { setStatus, remove } = useLibrary.getState();
  const manga = isManga(entry);
  // Only offer lists it can move to (nothing unreleased in Watching, nothing ongoing in Watched).
  const targets = LIST_STATUSES.filter((s) => s !== entry.status && !statusBlock(entry, s));
  const run = (index: number) => {
    if (index < targets.length) setStatus(entry, targets[index]);
    else if (index === targets.length) remove(entry.id);
  };
  const label = (s: ListStatus) => `Move to ${listMeta(s, manga).title}`;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: entry.title,
        options: [...targets.map(label), 'Remove from Library', 'Cancel'],
        destructiveButtonIndex: targets.length,
        cancelButtonIndex: targets.length + 1,
      },
      run
    );
  } else {
    Alert.alert(entry.title, undefined, [
      ...targets.map((s, i) => ({ text: label(s), onPress: () => run(i) })),
      { text: 'Remove', style: 'destructive' as const, onPress: () => run(targets.length) },
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }
}

export function LibraryScreen() {
  const { colors, canvas } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { columns, cardWidth } = useGrid();
  const status = useUi((s) => s.libraryList);
  const setStatus = useUi((s) => s.setLibraryList);
  const kind = useUi((s) => s.libraryKind);
  const setKind = useUi((s) => s.setLibraryKind);
  const entries = useLibrary((s) => s.entries);
  const hydrated = useLibrary((s) => s.hydrated);
  const manga = kind !== 'anime';
  const meta = listMeta(status, manga);
  const units = unitsOf({ type: manga ? 'MANGA' : 'ANIME' });

  const { items, counts, stats, tint } = useMemo(() => {
    const mine = Object.values(entries)
      .filter((e) => kindOf(e) === kind)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    const byStatus = Object.fromEntries(LIST_STATUSES.map((s) => [s, 0])) as Record<ListStatus, number>;
    let progress = 0;
    for (const e of mine) {
      byStatus[e.status] += 1;
      progress += e.progress;
    }
    return {
      items: mine.filter((e) => e.status === status),
      counts: byStatus,
      stats: { progress, active: byStatus.watching, done: byStatus.watched },
      // The page takes on the colour of whatever you touched last.
      tint: showAccent(mine[0]?.coverColor, colors.primary),
    };
  }, [entries, kind, status, colors.primary]);

  const listMode = status === 'watching';
  const cardsPerRow = width >= 700 ? 2 : 1;
  const continueWidth = Math.floor((width - GRID_PADDING * 2 - GRID_GAP * (cardsPerRow - 1)) / cardsPerRow);
  const numColumns = listMode ? cardsPerRow : columns;

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
        Library
      </Text>

      <View style={styles.kinds} accessibilityRole="tablist">
        {KINDS.map((k) => {
          const active = k.kind === kind;
          return (
            <PlatformPressable
              key={k.kind}
              haptic
              onPress={() => setKind(k.kind)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              hitSlop={8}>
              <Text style={[styles.kind, { color: active ? colors.text : colors.textSecondary }]}>{k.label}</Text>
              <View style={[styles.kindBar, { backgroundColor: active ? tint : 'transparent' }]} />
            </PlatformPressable>
          );
        })}
      </View>

      <View
        style={[
          styles.stats,
          {
            borderColor: withAlpha(tint, 0.35),
            backgroundColor: colors.surface,
            experimental_backgroundImage: `linear-gradient(120deg, ${withAlpha(tint, 0.3)} 0%, ${withAlpha(tint, 0.06)} 100%)`,
          },
        ]}>
        <Stat value={stats.progress} label={`${units.many} ${units.done.toLowerCase()}`} />
        <View style={[styles.statRule, { backgroundColor: withAlpha(tint, 0.35) }]} />
        <Stat value={stats.active} label="in progress" />
        <View style={[styles.statRule, { backgroundColor: withAlpha(tint, 0.35) }]} />
        <Stat value={stats.done} label="finished" />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
        {LIST_STATUSES.map((s) => {
          const m = listMeta(s, manga);
          const active = s === status;
          const fg = active ? readableOn(tint) : (colors.text as string);
          return (
            <PlatformPressable
              key={s}
              haptic
              onPress={() => setStatus(s)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${m.title}, ${counts[s]}`}
              style={[styles.pill, { backgroundColor: active ? tint : colors.fill }]}>
              <Icon sf={active ? m.sfSelected : m.sf} md={m.md} size={16} color={active ? fg : tint} />
              <Text style={[styles.pillLabel, { color: fg }]}>{m.title}</Text>
              <Text style={[styles.pillCount, { color: active ? fg : colors.textSecondary }]}>{counts[s]}</Text>
            </PlatformPressable>
          );
        })}
      </ScrollView>

      {items.length > 0 ? (
        <Text style={[Type.footnote, styles.hint, { color: colors.textSecondary }]}>
          Touch and hold to move or remove
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <FlatList<LibraryEntry>
        key={`${numColumns}:${listMode}`}
        style={styles.fill}
        numColumns={numColumns}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}
        columnWrapperStyle={numColumns > 1 ? styles.columns : undefined}
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) =>
          listMode ? (
            <View style={numColumns === 1 ? styles.single : undefined}>
              <ContinueCard entry={item} width={continueWidth} onLongPress={() => showQuickActions(item)} />
            </View>
          ) : (
            <PosterCard
              anime={item}
              width={cardWidth}
              showMark={false}
              subtitle={subtitleFor(item)}
              frames={item.status === 'dropped' ? { progress: item.progress, total: item.episodes } : undefined}
              onLongPress={() => showQuickActions(item)}
            />
          )
        }
        ListHeaderComponent={header}
        ListEmptyComponent={
          hydrated ? (
            <EmptyState
              sf={meta.sf}
              md={meta.md}
              title={meta.emptyTitle}
              body={meta.emptyBody}
              action={{
                title: `Find ${KINDS.find((k) => k.kind === kind)?.label ?? 'Anime'}`,
                sf: 'magnifyingglass',
                md: 'search',
                onPress: () => {
                  useUi.getState().setSearchKind(kind);
                  router.navigate('/(search)' as Href);
                },
              }}
            />
          ) : null
        }
      />
      {/* Fades content out under the status bar. */}
      <View
        pointerEvents="none"
        style={[
          styles.scrim,
          {
            height: insets.top + 16,
            experimental_backgroundImage: `linear-gradient(to bottom, ${canvas} 0%, ${withAlpha(canvas, 0.85)} 60%, ${withAlpha(canvas, 0)} 100%)`,
          },
        ]}
      />
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <Text style={[styles.statValue, { color: colors.text }]} maxFontSizeMultiplier={1.3}>
        {value.toLocaleString()}
      </Text>
      <Text style={[Type.caption, { color: colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, gap: 22 },
  columns: { gap: GRID_GAP, paddingHorizontal: GRID_PADDING },
  single: { paddingHorizontal: GRID_PADDING },
  header: { gap: 18 },
  title: { fontFamily: Fonts.display, fontSize: 40, lineHeight: 46, paddingHorizontal: 20 },
  kinds: { flexDirection: 'row', gap: 24, paddingHorizontal: 20 },
  kind: { fontFamily: Fonts.heading, fontSize: 20, lineHeight: 26 },
  kindBar: { height: 3, borderRadius: 2, marginTop: 4 },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: GRID_PADDING,
    paddingVertical: 16,
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 4 },
  statValue: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 34 },
  statRule: { width: StyleSheet.hairlineWidth * 2, alignSelf: 'stretch' },
  pills: { gap: 8, paddingHorizontal: GRID_PADDING },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  pillLabel: { ...Type.subhead, fontWeight: '700' },
  pillCount: { ...Type.subhead, fontWeight: '600', fontVariant: ['tabular-nums'] },
  hint: { paddingHorizontal: 20, marginTop: -6 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0 },
});
