import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '@/components/controls';
import { Icon } from '@/components/icon';
import { LIST_STATUSES, LISTS } from '@/constants/lists';
import { supabase, useAuth } from '@/lib/supabase';
import { syncLibrary, useSyncStatus } from '@/lib/sync';
import { useLibrary } from '@/store/library';
import { Fonts } from '@/theme/fonts';
import { useAppTheme } from '@/theme/theme';

const isIOS = Platform.OS === 'ios';

async function signOut() {
  // Best effort: push pending edits before the local copy is cleared.
  await syncLibrary();
  await supabase.auth.signOut();
  useLibrary.getState().reset();
}

export function AccountScreen() {
  const { colors } = useAppTheme();
  const user = useAuth((s) => s.session?.user);
  const entries = useLibrary((s) => s.entries);
  const pending = useLibrary(
    (s) => Object.keys(s.dirty).length + Object.keys(s.removed).length
  );
  const { syncing, error, lastSyncAt } = useSyncStatus();
  const [busy, setBusy] = useState<'out' | 'delete' | null>(null);

  const counts = LIST_STATUSES.map((status) => ({
    status,
    count: Object.values(entries).filter((e) => e.status === status).length,
  }));

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
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account and all your lists. This cannot be undone.',
      [
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
      ]
    );

  const syncLabel = syncing
    ? 'Syncing…'
    : error
      ? `Sync failed: ${error}`
      : pending > 0
        ? `${pending} change${pending === 1 ? '' : 's'} waiting to sync`
        : lastSyncAt
          ? `Synced ${new Date(lastSyncAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
          : 'Up to date';

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}>
      <View style={styles.profile}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.onPrimary }]}>
            {(user?.email ?? '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.email, { color: colors.text }]} selectable>
          {user?.email}
        </Text>
        {user?.created_at ? (
          <Text style={[styles.muted, { color: colors.textSecondary }]}>
            Member since {new Date(user.created_at).toLocaleDateString([], { month: 'long', year: 'numeric' })}
          </Text>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.counts}>
          {counts.map(({ status, count }) => (
            <View key={status} style={styles.count}>
              <Icon sf={LISTS[status].sfSelected} md={LISTS[status].md} size={18} color={colors.status[status]} />
              <Text style={[styles.countValue, { color: colors.text }]}>{count}</Text>
              <Text style={[styles.countLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                {LISTS[status].title}
              </Text>
            </View>
          ))}
        </View>
        <View style={[styles.separator, { backgroundColor: colors.separator }]} />
        <View style={styles.syncRow}>
          <Icon
            sf={error ? 'exclamationmark.icloud' : 'checkmark.icloud'}
            md={error ? 'cloud_off' : 'cloud_done'}
            size={20}
            color={error ? colors.danger : colors.textSecondary}
          />
          <Text style={[styles.syncText, { color: error ? colors.danger : colors.textSecondary }]} numberOfLines={2}>
            {syncLabel}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <ActionButton
          title="Sync Now"
          sf="arrow.triangle.2.circlepath"
          md="sync"
          block
          loading={syncing}
          onPress={() => syncLibrary()}
        />
        <ActionButton
          title="Sign Out"
          sf="rectangle.portrait.and.arrow.right"
          md="logout"
          variant="destructive"
          block
          loading={busy === 'out'}
          disabled={busy !== null}
          onPress={confirmSignOut}
        />
      </View>

      <View style={styles.danger}>
        <ActionButton
          title="Delete Account"
          sf="trash"
          md="delete_forever"
          variant="destructive"
          loading={busy === 'delete'}
          disabled={busy !== null}
          onPress={confirmDelete}
        />
      </View>

      {isIOS ? null : (
        <View style={styles.center}>
          <ActionButton title="Done" variant="tonal" onPress={() => router.back()} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 20 },
  profile: { alignItems: 'center', gap: 6, paddingTop: 8 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  avatarText: { fontFamily: Fonts.display, fontSize: 30 },
  email: { fontFamily: Fonts.heading, fontSize: 20 },
  muted: { fontFamily: Fonts.label, fontSize: 14 },
  card: { borderRadius: isIOS ? 20 : 24, borderCurve: 'continuous', padding: 16, gap: 14 },
  counts: { flexDirection: 'row' },
  count: { flex: 1, alignItems: 'center', gap: 2 },
  countValue: { fontFamily: Fonts.display, fontSize: 22, fontVariant: ['tabular-nums'] },
  countLabel: { fontFamily: Fonts.label, fontSize: 12 },
  separator: { height: StyleSheet.hairlineWidth },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  syncText: { flex: 1, fontFamily: Fonts.label, fontSize: 15 },
  actions: { gap: 12 },
  danger: { alignItems: 'center', marginTop: 12 },
  center: { alignItems: 'center' },
});
