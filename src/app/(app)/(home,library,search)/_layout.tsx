import { Link, Stack } from 'expo-router';
import { Pressable } from 'react-native';

import { Icon } from '@/components/icon';
import { TabContext, type TabKey } from '@/components/tab-context';
import { rootScreenOptions, useStackScreenOptions } from '@/theme/stack-options';
import { useAppTheme } from '@/theme/theme';

const TITLES: Record<TabKey, string> = { home: 'Home', library: 'Library', search: 'Search' };

/**
 * One stack per tab. This shared route group is expanded by Expo Router into
 * `(home)`, `(library)` and `(search)`, so the detail screen is pushed inside
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
            // Home greets you in its content instead of a "Home" title.
            ...(tab === 'home' ? { title: '', headerLargeTitle: false } : { title: TITLES[tab] }),
            headerRight: tab === 'home' ? () => <AccountButton /> : undefined,
          }}
        />
        <Stack.Screen name="anime/[id]" options={{ title: '', headerLargeTitle: false }} />
      </Stack>
    </TabContext>
  );
}

function AccountButton() {
  const { colors } = useAppTheme();
  return (
    <Link href="/account" asChild>
      <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel="Account">
        <Icon sf="person.crop.circle" md="account_circle" size={26} color={colors.primary} />
      </Pressable>
    </Link>
  );
}
