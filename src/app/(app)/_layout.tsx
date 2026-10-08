import { View } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { CelebrationOverlay, useFinishCelebrations } from '@/components/celebration';
import { useAiringRefresh } from '@/lib/airing-refresh';
import { useAuth } from '@/lib/supabase';
import { useLibrarySync } from '@/lib/sync';

/** Signed-in area: the tab bar, with the library kept in sync with Supabase. */
export default function AppLayout() {
  const userId = useAuth((s) => s.session?.user.id);
  return userId ? <SyncedTabs userId={userId} /> : null;
}

function SyncedTabs({ userId }: { userId: string }) {
  useLibrarySync(userId);
  useAiringRefresh();
  useFinishCelebrations();
  return (
    <View style={{ flex: 1 }}>
      <AppTabs />
      <CelebrationOverlay />
    </View>
  );
}
