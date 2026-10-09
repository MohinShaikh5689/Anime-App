import { Stack } from 'expo-router';

import { TabContext, type TabKey } from '@/components/tab-context';
import { rootScreenOptions, useStackScreenOptions } from '@/theme/stack-options';

const TITLES: Record<TabKey, string> = { home: 'Home', manga: 'Manga', library: 'Library', search: 'Search' };

/**
 * One stack per tab. This shared route group is expanded by Expo Router into
 * `(home)`, `(manga)`, `(library)` and `(search)`, so the detail screen is pushed inside
 * whichever tab it was opened from.
 */
export default function TabStackLayout({ segment }: { segment: string }) {
  const tab = segment.replace(/[()]/g, '') as TabKey;
  const screenOptions = useStackScreenOptions();

  return (
    <TabContext value={tab}>
      <Stack screenOptions={screenOptions}>
        <Stack.Screen
          name="index"
          options={{
            ...rootScreenOptions,
            title: TITLES[tab],
            // Home and Library draw their own headers; Search keeps the native search bar.
            headerShown: tab === 'search',
          }}
        />
        <Stack.Screen
          name="anime/[id]"
          options={{
            title: '',
            headerLargeTitle: false,
            headerTransparent: true,
            headerBlurEffect: undefined,
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: '#FFFFFF',
            // iOS 26 fades content under a transparent bar into the background (a black
            // band behind the Dynamic Island); the cover art should run to the top edge.
            scrollEdgeEffects: { top: 'hidden' },
          }}
        />
      </Stack>
    </TabContext>
  );
}

