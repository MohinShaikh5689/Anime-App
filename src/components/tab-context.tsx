import type { Href } from 'expo-router';
import { createContext, useCallback, useContext } from 'react';

export type TabKey = 'home' | 'manga' | 'library' | 'search';

/**
 * Each tab hosts its own stack (via the shared `(home,manga,library,search)` route group),
 * so screens need to know which tab they live in to push detail screens onto it.
 */
export const TabContext = createContext<TabKey>('home');

export function useTab() {
  return useContext(TabContext);
}

export function useAnimeHref() {
  const tab = useTab();
  return useCallback((id: number) => `/(${tab})/anime/${id}` as Href, [tab]);
}
