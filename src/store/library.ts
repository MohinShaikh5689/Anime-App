import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ListStatus } from '@/constants/lists';
import type { AnimeSummary } from '@/lib/anilist';

export type LibraryEntry = AnimeSummary & {
  status: ListStatus;
  /** Episodes watched. */
  progress: number;
  /** Personal rating, 1–5 stars, or null when unrated. */
  rating: number | null;
  addedAt: number;
  updatedAt: number;
};

type LibraryState = {
  entries: Record<number, LibraryEntry>;
  hydrated: boolean;
  setStatus: (anime: AnimeSummary, status: ListStatus) => void;
  setProgress: (id: number, progress: number) => void;
  incrementProgress: (id: number) => void;
  setRating: (id: number, rating: number | null) => void;
  remove: (id: number) => void;
};

function clampProgress(progress: number, episodes: number | null) {
  const max = episodes ?? Number.MAX_SAFE_INTEGER;
  return Math.max(0, Math.min(Math.round(progress), max));
}

export const useLibrary = create<LibraryState>()(
  persist(
    (set) => ({
      entries: {},
      hydrated: false,

      setStatus: (anime, status) =>
        set((state) => {
          const now = Date.now();
          const existing = state.entries[anime.id];
          // Refresh cached metadata (episode counts change for airing shows).
          const base: LibraryEntry = existing
            ? { ...existing, ...anime, status, updatedAt: now }
            : { ...anime, status, progress: 0, rating: null, addedAt: now, updatedAt: now };
          if (status === 'watched' && base.episodes) base.progress = base.episodes;
          return { entries: { ...state.entries, [anime.id]: base } };
        }),

      setProgress: (id, progress) =>
        set((state) => {
          const entry = state.entries[id];
          if (!entry) return state;
          const next = clampProgress(progress, entry.episodes);
          // Starting a show from the wishlist moves it to Watching.
          const status = entry.status === 'wishlist' && next > 0 ? 'watching' : entry.status;
          return {
            entries: {
              ...state.entries,
              [id]: { ...entry, progress: next, status, updatedAt: Date.now() },
            },
          };
        }),

      incrementProgress: (id) =>
        set((state) => {
          const entry = state.entries[id];
          if (!entry) return state;
          const next = clampProgress(entry.progress + 1, entry.episodes);
          const status = entry.status === 'wishlist' ? 'watching' : entry.status;
          return {
            entries: {
              ...state.entries,
              [id]: { ...entry, progress: next, status, updatedAt: Date.now() },
            },
          };
        }),

      setRating: (id, rating) =>
        set((state) => {
          const entry = state.entries[id];
          if (!entry) return state;
          return {
            entries: { ...state.entries, [id]: { ...entry, rating, updatedAt: Date.now() } },
          };
        }),

      remove: (id) =>
        set((state) => {
          const { [id]: _removed, ...rest } = state.entries;
          return { entries: rest };
        }),
    }),
    {
      name: 'anime-library',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ entries: state.entries }),
      onRehydrateStorage: () => () => useLibrary.setState({ hydrated: true }),
    }
  )
);

export function useEntry(id: number): LibraryEntry | undefined {
  return useLibrary((s) => s.entries[id]);
}
