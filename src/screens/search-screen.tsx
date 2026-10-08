/**
 * iOS search: the native navigation-bar search field. On iOS 26 the Search tab
 * (role="search") turns it into the floating Liquid Glass search field.
 */
import { Stack } from 'expo-router';
import { useState } from 'react';

import { SearchResults } from './search-results';

export function SearchScreen() {
  const [query, setQuery] = useState('');
  return (
    <>
      <Stack.SearchBar
        placeholder="Anime, manga, manhwa"
        hideWhenScrolling={false}
        autoCapitalize="none"
        onChangeText={(e) => setQuery(e.nativeEvent.text)}
        onCancelButtonPress={() => setQuery('')}
      />
      <SearchResults query={query} />
    </>
  );
}
