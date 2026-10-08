/**
 * Native system tab bar on both platforms: UITabBarController (Liquid Glass on iOS 26)
 * and the Material 3 bottom navigation bar on Android.
 */
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Platform } from 'react-native';

import { LIST_STATUSES, LISTS } from '@/constants/lists';
import { useAppTheme } from '@/theme/theme';

export default function AppTabs() {
  const { colors } = useAppTheme();

  return (
    <NativeTabs
      tintColor={colors.primary}
      minimizeBehavior="onScrollDown"
      labelVisibilityMode="labeled"
      {...(Platform.OS === 'android' && {
        backgroundColor: colors.surface,
        indicatorColor: colors.fill,
      })}>
      {LIST_STATUSES.map((status) => {
        const meta = LISTS[status];
        return (
          <NativeTabs.Trigger key={status} name={`(${status})`}>
            <NativeTabs.Trigger.Label>{meta.title}</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf={{ default: meta.sf, selected: meta.sfSelected }} md={meta.md} />
          </NativeTabs.Trigger>
        );
      })}
      <NativeTabs.Trigger name="(search)" role="search">
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
