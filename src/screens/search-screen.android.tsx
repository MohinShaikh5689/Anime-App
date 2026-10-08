/** Android search: a Material 3 search bar pinned above the results. */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Searchbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchResults } from './search-results';
import { useAppTheme } from '@/theme/theme';

export function SearchScreen() {
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
        <Searchbar
          placeholder="Search anime"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          icon="search"
          clearIcon="close"
        />
      </View>
      <SearchResults query={query} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bar: { paddingHorizontal: 16, paddingBottom: 8 },
});
