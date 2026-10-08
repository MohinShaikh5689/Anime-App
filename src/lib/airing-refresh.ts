import { useEffect } from 'react';
import { AppState } from 'react-native';

import { getAiringInfo } from '@/lib/anilist';
import { useLibrary } from '@/store/library';

const INTERVAL = 30 * 60_000;
let lastRun = 0;
let running = false;

/** Refetches airing state for every show that isn't finished yet. */
async function refreshAiring() {
  if (running || Date.now() - lastRun < INTERVAL) return;
  const { entries, hydrated } = useLibrary.getState();
  if (!hydrated) return;
  const ids = Object.values(entries)
    .filter((e) => e.status !== 'watched' || e.airingStatus == null)
    .map((e) => e.id);
  if (ids.length === 0) return;
  running = true;
  try {
    const metas = await getAiringInfo(ids);
    useLibrary.getState().updateMeta(metas);
    lastRun = Date.now();
  } catch {
    // Offline or rate limited: try again on the next foreground.
  } finally {
    running = false;
  }
}

/** Keeps airing data fresh on launch and whenever the app returns to the foreground. */
export function useAiringRefresh() {
  useEffect(() => {
    refreshAiring();
    const unsubscribe = useLibrary.subscribe((state, prev) => {
      if (state.hydrated && !prev.hydrated) refreshAiring();
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshAiring();
    });
    return () => {
      unsubscribe();
      appState.remove();
    };
  }, []);
}
