import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import { useTab } from '@/components/tab-context';
import { HomeScreen } from '@/screens/home-screen';
import { LibraryScreen } from '@/screens/library-screen';
import { SearchScreen } from '@/screens/search-screen';

export default function TabIndex() {
  const tab = useTab();
  if (tab === 'search') {
    return (
      <>
        {/* Android draws its own Material search bar in place of the app bar. */}
        {Platform.OS === 'android' ? <Stack.Screen options={{ headerShown: false }} /> : null}
        <SearchScreen />
      </>
    );
  }
  if (tab === 'manga') return <HomeScreen medium="manga" />;
  return tab === 'home' ? <HomeScreen /> : <LibraryScreen />;
}
