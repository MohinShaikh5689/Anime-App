import { Stack } from 'expo-router';

import { TabContext, type TabKey } from '@/components/tab-context';
import { LISTS } from '@/constants/lists';
import { rootScreenOptions, useStackScreenOptions } from '@/theme/stack-options';

/**
 * One stack per tab. This shared route group is expanded by Expo Router into
 * `(watching)`, `(wishlist)`, `(watched)`, `(dropped)` and `(search)`, so the detail
 * screen is pushed inside whichever tab it was opened from.
 */
export default function TabStackLayout({ segment }: { segment: string }) {
  const tab = segment.replace(/[()]/g, '') as TabKey;
  const screenOptions = useStackScreenOptions();
  const title = tab === 'search' ? 'Search' : LISTS[tab].title;

  return (
    <TabContext value={tab}>
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="index" options={{ ...rootScreenOptions, title }} />
        <Stack.Screen name="anime/[id]" options={{ title: '', headerLargeTitle: false }} />
      </Stack>
    </TabContext>
  );
}
