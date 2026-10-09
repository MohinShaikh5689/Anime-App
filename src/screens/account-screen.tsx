import Constants from 'expo-constants';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fade } from '@/components/fade';
import { Icon } from '@/components/icon';
import { Art, Poster } from '@/components/poster';
import { LIST_STATUSES, listMeta } from '@/constants/lists';
import { isManga } from '@/lib/anilist';
import { readableOn, showAccent, withAlpha } from '@/lib/color';
import { supabase, useAuth } from '@/lib/supabase';
import { syncLibrary, useSyncStatus } from '@/lib/sync';
import { type LibraryEntry, useLibrary } from '@/store/library';
import { Fonts } from '@/theme/fonts';
import { useAppTheme } from '@/theme/theme';
import { Type } from '@/theme/type';

const isIOS = Platform.OS === 'ios';
const BANNER = 230;
/** Typical TV episode length, for the hours-watched estimate. */
const EPISODE_MINUTES = 24;

async function signOut() {
  // Best effort: push pending edits before the local copy is cleared.
  await syncLibrary();
  await supabase.auth.signOut();
  useLibrary.getState().reset();
}

/** Your best-rated (then most recent) titles, for the banner and top pick. */
function favourites(entries: LibraryEntry[]) {
  return [...entries].sort(
    (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.status === 'watched' ? 1 : 0) - (a.status === 'watched' ? 1 : 0) || b.updatedAt - a.updatedAt
  );
}

export function AccountScreen() {
  const { colors, canvas } = useAppTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const user = useAuth((s) => s.session?.user);
  const entries = useLibrary((s) => s.entries);
  const pending = useLibrary((s) => Object.keys(s.dirty).length + Object.keys(s.removed).length);
  const { syncing, error, lastSyncAt } = useSyncStatus();
  const [busy, setBusy] = useState<'out' | 'delete' | null>(null);

  const stats = useMemo(() => {
    const all = Object.values(entries);
    const anime = all.filter((e) => !isManga(e));
    const comics = all.filter(isManga);
    const rated = all.filter((e) => e.rating != null);
    const episodes = anime.reduce((n, e) => n + e.progress, 0);
    const ranked = favourites(all);
    const count = (list: LibraryEntry[]) =>
      Object.fromEntries(LIST_STATUSES.map((s) => [s, list.filter((e) => e.status === s).length]));
    return {
      total: all.length,
      episodes,
      hours: Math.round((episodes * EPISODE_MINUTES) / 60),
      chapters: comics.reduce((n, e) => n + e.progress, 0),
      finished: all.filter((e) => e.status === 'watched').length,
      average: rated.length ? rated.reduce((n, e) => n + (e.rating ?? 0), 0) / rated.length : null,
      top: ranked.find((e) => e.rating) ?? null,
      covers: ranked.filter((e) => e.coverUrl).slice(0, 8),
      anime: count(anime),
      comics: count(comics),
      hasAnime: anime.length > 0,
      hasComics: comics.length > 0,
    };
  }, [entries]);

  const accent = showAccent(stats.top?.coverColor ?? stats.covers[0]?.coverColor, colors.primary);
  const onAccent = readableOn(accent);
  const email = user?.email ?? '';
  const name = email.split('@')[0];

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'Your lists stay saved in your account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setBusy('out');
          await signOut();
        },
      },
    ]);

  const confirmDelete = () =>
    Alert.alert('Delete account?', 'This permanently deletes your account and all your lists. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy('delete');
          const { error: rpcError } = await supabase.rpc('delete_account');
          if (rpcError) {
            setBusy(null);
            Alert.alert("Couldn't delete account", rpcError.message);
            return;
          }
          await supabase.auth.signOut({ scope: 'local' });
          useLibrary.getState().reset();
        },
      },
    ]);

  const syncLabel = syncing
    ? 'Syncing…'
    : error
      ? `Sync failed: ${error}`
      : pending > 0
        ? `${pending} change${pending === 1 ? '' : 's'} waiting to sync`
        : lastSyncAt
          ? `Synced at ${new Date(lastSyncAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
          : 'Everything is backed up';

  const tile = Math.floor((width - 32 - 12) / 2);
  const coverWidth = Math.ceil(width / 4);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      {/* Banner: a wall of your favourite covers, or the accent colour when the library is empty. */}
      <View style={[styles.banner, { backgroundColor: accent }]}>
        <View style={styles.wall}>
          {stats.covers.map((e) => (
            <Art key={e.id} uri={e.coverUrl} color={e.coverColor} style={{ width: coverWidth, height: coverWidth * 1.5 }} />
          ))}
        </View>
        <Fade color="#000000" height={110} max={0.5} flip style={styles.bannerTop} />
        <Fade color={canvas} height={150} style={styles.bannerBottom} />
      </View>

      <View style={styles.profile}>
        <View style={[styles.avatar, { backgroundColor: accent, borderColor: canvas }]}>
          <Text style={[styles.avatarText, { color: onAccent }]}>{(name || '?').charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[Type.subhead, { color: colors.textSecondary }]} selectable numberOfLines={1}>
          {email}
        </Text>
        {user?.created_at ? (
          <View style={[styles.since, { backgroundColor: withAlpha(accent, 0.16) }]}>
            <Text style={[Type.footnote, styles.sinceText, { color: colors.text }]}>
              Member since {new Date(user.created_at).toLocaleDateString([], { month: 'long', year: 'numeric' })}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.tiles}>
        <StatTile width={tile} accent={accent} value={stats.episodes} label="episodes watched" sf="play.tv.fill" md="live_tv" />
        <StatTile width={tile} accent={accent} value={stats.hours} label="hours of anime" sf="clock.fill" md="schedule" />
        <StatTile width={tile} accent={accent} value={stats.chapters} label="chapters read" sf="book.fill" md="menu_book" />
        <StatTile width={tile} accent={accent} value={stats.finished} label="titles finished" sf="checkmark.seal.fill" md="verified" />
      </View>

      {stats.top ? (
        <Section title="Your top pick">
          <View style={[styles.card, styles.topPick, { backgroundColor: colors.surface, borderColor: withAlpha(accent, 0.35) }]}>
            <Poster uri={stats.top.coverUrl} color={stats.top.coverColor} width={64} />
            <View style={styles.topText}>
              <Text style={[Type.headline, { color: colors.text }]} numberOfLines={2}>
                {stats.top.title}
              </Text>
              <Text style={[styles.stars, { color: accent }]} accessibilityLabel={`Rated ${stats.top.rating} out of 5`}>
                {'★'.repeat(stats.top.rating ?? 0)}
                <Text style={{ color: colors.separator }}>{'★'.repeat(5 - (stats.top.rating ?? 0))}</Text>
              </Text>
              {stats.average != null ? (
                <Text style={[Type.footnote, { color: colors.textSecondary }]}>
                  You rate {stats.average.toFixed(1)} stars on average
                </Text>
              ) : null}
            </View>
          </View>
        </Section>
      ) : null}

      {stats.total > 0 ? (
        <Section title="Your lists">
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {stats.hasAnime ? <ListBreakdown label="Anime" counts={stats.anime} manga={false} accent={accent} /> : null}
            {stats.hasAnime && stats.hasComics ? (
              <View style={[styles.rule, { backgroundColor: colors.separator }]} />
            ) : null}
            {stats.hasComics ? (
              <ListBreakdown label="Manga & Manhwa" counts={stats.comics} manga accent={accent} />
            ) : null}
          </View>
        </Section>
      ) : null}

      <Section title="Account">
        <View style={[styles.card, styles.group, { backgroundColor: colors.surface }]}>
          <Row
            sf={error ? 'exclamationmark.icloud.fill' : 'icloud.fill'}
            md={error ? 'cloud_off' : 'cloud_done'}
            tint={error ? (colors.danger as string) : accent}
            title="Sync Now"
            detail={syncLabel}
            detailColor={error ? (colors.danger as string) : undefined}
            busy={syncing}
            onPress={() => syncLibrary()}
          />
          <Row
            sf="rectangle.portrait.and.arrow.right"
            md="logout"
            tint={colors.danger as string}
            title="Sign Out"
            destructive
            busy={busy === 'out'}
            disabled={busy !== null}
            onPress={confirmSignOut}
          />
          <Row
            sf="trash.fill"
            md="delete_forever"
            tint={colors.danger as string}
            title="Delete Account"
            detail="Removes your account and every list"
            destructive
            busy={busy === 'delete'}
            disabled={busy !== null}
            onPress={confirmDelete}
            last
          />
        </View>
      </Section>

      <Text style={[Type.footnote, styles.footer, { color: colors.textSecondary }]}>
        Data from AniList, MangaDex and MangaUpdates{'\n'}Version {Constants.expoConfig?.version ?? '1.0.0'}
      </Text>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

function StatTile({
  width,
  accent,
  value,
  label,
  sf,
  md,
}: {
  width: number;
  accent: string;
  value: number;
  label: string;
  sf: SFSymbol;
  md: AndroidSymbol;
}) {
  const { colors } = useAppTheme();
  return (
    <View
      style={[styles.tile, { width, backgroundColor: colors.surface, borderColor: withAlpha(accent, 0.3) }]}
      accessible
      accessibilityLabel={`${value} ${label}`}>
      <Icon sf={sf} md={md} size={18} color={accent} />
      <Text style={[styles.tileValue, { color: colors.text }]} maxFontSizeMultiplier={1.3} numberOfLines={1}>
        {value.toLocaleString()}
      </Text>
      <Text style={[Type.footnote, { color: colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function ListBreakdown({
  label,
  counts,
  manga,
  accent,
}: {
  label: string;
  counts: Record<string, number>;
  manga: boolean;
  accent: string;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.breakdown}>
      <Text style={[Type.subhead, styles.breakdownLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.breakdownRow}>
        {LIST_STATUSES.map((s) => {
          const m = listMeta(s, manga);
          return (
            <View key={s} style={styles.breakdownItem} accessible accessibilityLabel={`${m.title}: ${counts[s]}`}>
              <Text style={[styles.breakdownValue, { color: counts[s] ? colors.text : colors.textSecondary }]}>
                {counts[s]}
              </Text>
              <View style={styles.breakdownName}>
                <Icon sf={m.sfSelected} md={m.md} size={12} color={accent} />
                <Text style={[Type.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                  {m.title}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Row({
  sf,
  md,
  tint,
  title,
  detail,
  detailColor,
  destructive,
  busy,
  disabled,
  last,
  onPress,
}: {
  sf: SFSymbol;
  md: AndroidSymbol;
  tint: string;
  title: string;
  detail?: string;
  detailColor?: string;
  destructive?: boolean;
  busy?: boolean;
  disabled?: boolean;
  last?: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      android_ripple={{ color: 'rgba(127,127,127,0.18)' }}
      style={({ pressed }) => [styles.row, pressed && isIOS && { backgroundColor: colors.fill }]}>
      <View style={[styles.rowIcon, { backgroundColor: withAlpha(tint, 0.16) }]}>
        <Icon sf={sf} md={md} size={17} color={tint} />
      </View>
      <View
        style={[
          styles.rowBody,
          !last && { borderBottomColor: colors.separator, borderBottomWidth: StyleSheet.hairlineWidth },
        ]}>
        <View style={styles.rowText}>
          <Text style={[Type.body, { color: destructive ? colors.danger : colors.text }]}>{title}</Text>
          {detail ? (
            <Text style={[Type.footnote, { color: detailColor ?? colors.textSecondary }]} numberOfLines={2}>
              {detail}
            </Text>
          ) : null}
        </View>
        {busy ? <ActivityIndicator /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: { height: BANNER, overflow: 'hidden' },
  wall: { flexDirection: 'row', flexWrap: 'wrap', opacity: 0.85 },
  bannerTop: { position: 'absolute', top: 0, left: 0, right: 0 },
  bannerBottom: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  profile: { alignItems: 'center', gap: 4, marginTop: -56, paddingHorizontal: 24 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: { fontFamily: Fonts.display, fontSize: 42, lineHeight: 50 },
  name: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 34 },
  since: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  sinceText: { fontWeight: '600' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, marginTop: 28 },
  tile: {
    padding: 14,
    gap: 4,
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  tileValue: { fontFamily: Fonts.display, fontSize: 30, lineHeight: 36, fontVariant: ['tabular-nums'], marginTop: 4 },
  section: { marginTop: 30, paddingHorizontal: 16, gap: 12 },
  sectionTitle: { fontFamily: Fonts.display, fontSize: 22, lineHeight: 28, paddingHorizontal: 4 },
  card: { borderRadius: 20, borderCurve: 'continuous', overflow: 'hidden' },
  topPick: { flexDirection: 'row', gap: 14, padding: 12, borderWidth: StyleSheet.hairlineWidth * 2 },
  topText: { flex: 1, justifyContent: 'center', gap: 4 },
  stars: { fontSize: 18, letterSpacing: 2 },
  rule: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  breakdown: { padding: 16, gap: 10 },
  breakdownLabel: { fontWeight: '600' },
  breakdownRow: { flexDirection: 'row' },
  breakdownItem: { flex: 1, gap: 2 },
  breakdownValue: { fontFamily: Fonts.display, fontSize: 24, lineHeight: 30, fontVariant: ['tabular-nums'] },
  breakdownName: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  group: { paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 14 },
  rowIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingVertical: 10, paddingRight: 16 },
  rowText: { flex: 1, gap: 2 },
  footer: { textAlign: 'center', marginTop: 28, lineHeight: 18 },
});
