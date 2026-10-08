import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ListStatus } from '@/constants/lists';
import type { AnimeSummary } from '@/lib/anilist';
import { isComplete, isUnaired, maxProgress, statusBlock } from '@/lib/airing';

export type LibraryEntry = AnimeSummary & {
  status: ListStatus;
  /** Episodes watched. */
  progress: number;
  /** Personal rating, 1–5 stars, or null when unrated. */
  rating: number | null;
  addedAt: number;
  updatedAt: number;
};

/** A row of `public.library_entries` in Supabase. */
export type RemoteEntry = {
  anime_id: number;
  /** ANIME or MANGA; null on rows written before manga support. */
  media_type?: string | null;
  country?: string | null;
  title: string;
  cover_url: string | null;
  cover_color: string | null;
  episodes: number | null;
  format: string | null;
  year: number | null;
  average_score: number | null;
  status: ListStatus;
  progress: number;
  rating: number | null;
  added_at: string;
  updated_at: string;
  deleted_at: string | null;
  synced_at: string;
};

type LibraryState = {
  entries: Record<number, LibraryEntry>;
  /** Entries changed on this device that haven't been pushed yet. */
  dirty: Record<number, true>;
  /** Entries removed on this device that haven't been pushed yet (id → removedAt). */
  removed: Record<number, number>;
  /** Supabase user the local data belongs to. */
  ownerId: string | null;
  /** Server `synced_at` watermark of the last pull. */
  lastSyncedAt: string | null;
  hydrated: boolean;

  setStatus: (anime: AnimeSummary, status: ListStatus) => void;
  setProgress: (id: number, progress: number) => void;
  incrementProgress: (id: number) => void;
  setRating: (id: number, rating: number | null) => void;
  remove: (id: number) => void;
  /** Refreshes cached AniList metadata (airing state) without counting as a user edit. */
  updateMeta: (metas: AnimeSummary[]) => void;

  /** Binds local data to a user, uploading data created before sign-in. */
  claim: (userId: string) => void;
  markPushed: (pushed: { id: number; updatedAt: number }[], removed: { id: number; at: number }[]) => void;
  applyRemote: (rows: RemoteEntry[]) => void;
  reset: () => void;
};

/** Progress can't pass the last aired episode. */
function clampProgress(progress: number, entry: AnimeSummary) {
  return Math.max(0, Math.min(Math.round(progress), maxProgress(entry)));
}

/** Copies fresh metadata over an entry, ignoring fields the source doesn't carry. */
function mergeMeta<T extends AnimeSummary>(entry: T, anime: AnimeSummary): T {
  const next = { ...entry };
  for (const [key, value] of Object.entries(anime)) {
    if (value !== undefined) (next as Record<string, unknown>)[key] = value;
  }
  return next;
}

/** The list a show belongs in after logging episodes. */
function statusForProgress(entry: LibraryEntry, progress: number): ListStatus {
  // The final episode is watched: it's finished.
  if (isComplete(entry, progress)) return 'watched';
  if (entry.status === 'wishlist' && progress > 0) return 'watching';
  // Un-logging the finale of a finished show puts it back in progress.
  if (entry.status === 'watched' && entry.episodes != null && progress < entry.episodes) return 'watching';
  return entry.status;
}

/** Airing metadata is device-local (not synced), so keep it across remote merges. */
const LOCAL_META = ['airingStatus', 'airedEpisodes', 'nextAiringAt', 'bannerUrl'] as const;

function withoutKey<T>(record: Record<number, T>, id: number) {
  if (!(id in record)) return record;
  const { [id]: _omit, ...rest } = record;
  return rest;
}

export function toRemote(entry: LibraryEntry, userId: string) {
  return {
    user_id: userId,
    anime_id: entry.id,
    media_type: entry.type ?? 'ANIME',
    country: entry.country ?? null,
    title: entry.title,
    cover_url: entry.coverUrl,
    cover_color: entry.coverColor,
    episodes: entry.episodes,
    format: entry.format,
    year: entry.year,
    average_score: entry.averageScore,
    status: entry.status,
    progress: entry.progress,
    rating: entry.rating,
    added_at: new Date(entry.addedAt).toISOString(),
    updated_at: new Date(entry.updatedAt).toISOString(),
    deleted_at: null,
  };
}

function fromRemote(row: RemoteEntry): LibraryEntry {
  return {
    id: row.anime_id,
    type: row.media_type === 'MANGA' ? 'MANGA' : 'ANIME',
    country: row.country ?? null,
    title: row.title,
    coverUrl: row.cover_url,
    coverColor: row.cover_color,
    episodes: row.episodes,
    format: row.format,
    year: row.year,
    averageScore: row.average_score,
    status: row.status,
    progress: row.progress,
    rating: row.rating,
    addedAt: Date.parse(row.added_at),
    updatedAt: Date.parse(row.updated_at),
  };
}

const EMPTY = { entries: {}, dirty: {}, removed: {}, lastSyncedAt: null };

export const useLibrary = create<LibraryState>()(
  persist(
    (set) => {
      /** Writes an entry and marks it for upload. */
      const write = (state: LibraryState, entry: LibraryEntry) => ({
        entries: { ...state.entries, [entry.id]: entry },
        dirty: { ...state.dirty, [entry.id]: true as const },
        removed: withoutKey(state.removed, entry.id),
      });

      return {
        ...EMPTY,
        ownerId: null,
        hydrated: false,

        setStatus: (anime, status) =>
          set((state) => {
            const now = Date.now();
            const existing = state.entries[anime.id];
            // Refresh cached metadata (episode counts change for airing shows).
            const entry: LibraryEntry = existing
              ? { ...mergeMeta(existing, anime), status, updatedAt: now }
              : { ...anime, status, progress: 0, rating: null, addedAt: now, updatedAt: now };
            if (statusBlock(entry, status)) return state;
            if (status === 'watched' && entry.episodes) entry.progress = entry.episodes;
            entry.progress = clampProgress(entry.progress, entry);
            if (status === 'watching' && isComplete(entry, entry.progress) && entry.progress > 0) {
              // Re-watching a finished show starts it over.
              entry.progress = 0;
            }
            return write(state, entry);
          }),

        setProgress: (id, progress) =>
          set((state) => {
            const entry = state.entries[id];
            if (!entry || isUnaired(entry)) return state;
            const next = clampProgress(progress, entry);
            if (next === entry.progress) return state;
            const status = statusForProgress(entry, next);
            return write(state, { ...entry, progress: next, status, updatedAt: Date.now() });
          }),

        incrementProgress: (id) =>
          set((state) => {
            const entry = state.entries[id];
            if (!entry || isUnaired(entry)) return state;
            const next = clampProgress(entry.progress + 1, entry);
            if (next === entry.progress) return state;
            const status = statusForProgress(entry, next);
            return write(state, { ...entry, progress: next, status, updatedAt: Date.now() });
          }),

        setRating: (id, rating) =>
          set((state) => {
            const entry = state.entries[id];
            if (!entry) return state;
            return write(state, { ...entry, rating, updatedAt: Date.now() });
          }),

        remove: (id) =>
          set((state) => ({
            entries: withoutKey(state.entries, id),
            dirty: withoutKey(state.dirty, id),
            removed: { ...state.removed, [id]: Date.now() },
          })),

        updateMeta: (metas) =>
          set((state) => {
            let next: Partial<LibraryState> | null = null;
            for (const anime of metas) {
              const entry = state.entries[anime.id];
              if (!entry) continue;
              const merged = mergeMeta(entry, anime);
              const s = (next ?? state) as LibraryState;
              // A show you were caught up on just finished airing: it's watched.
              if (entry.status === 'watching' && isComplete(merged, merged.progress)) {
                next = { ...s, ...write(s, { ...merged, status: 'watched', updatedAt: Date.now() }) };
              } else {
                next = { ...s, entries: { ...s.entries, [anime.id]: merged } };
              }
            }
            return next ?? state;
          }),

        claim: (userId) =>
          set((state) => {
            if (state.ownerId === userId) return state;
            if (state.ownerId === null) {
              // Lists made before signing in: upload everything.
              const dirty = Object.fromEntries(
                Object.keys(state.entries).map((id) => [id, true as const])
              );
              return { ownerId: userId, dirty, lastSyncedAt: null };
            }
            // A different account: start from that account's cloud data.
            return { ...EMPTY, ownerId: userId };
          }),

        markPushed: (pushed, removed) =>
          set((state) => {
            let dirty = state.dirty;
            for (const p of pushed) {
              // Keep the flag if the entry changed again while the push was in flight.
              if (state.entries[p.id]?.updatedAt === p.updatedAt) dirty = withoutKey(dirty, p.id);
            }
            let pendingRemovals = state.removed;
            for (const r of removed) {
              if (pendingRemovals[r.id] === r.at) pendingRemovals = withoutKey(pendingRemovals, r.id);
            }
            return { dirty, removed: pendingRemovals };
          }),

        applyRemote: (rows) =>
          set((state) => {
            if (rows.length === 0) return state;
            let { entries, dirty, removed } = state;
            for (const row of rows) {
              const id = row.anime_id;
              const remoteUpdated = Date.parse(row.updated_at);
              const local = entries[id];
              // Newer local edits win until they are pushed.
              if (dirty[id] && local && local.updatedAt > remoteUpdated) continue;
              if (removed[id] !== undefined && removed[id] >= remoteUpdated) continue;

              if (row.deleted_at) {
                entries = withoutKey(entries, id);
              } else {
                const entry = fromRemote(row);
                if (local) for (const key of LOCAL_META) (entry as Record<string, unknown>)[key] = local[key];
                // Before migration 0003 the server has no media type; keep what this device knows.
                if (local && row.media_type == null) {
                  entry.type = local.type;
                  entry.country = local.country;
                }
                entries = { ...entries, [id]: entry };
              }
              dirty = withoutKey(dirty, id);
              removed = withoutKey(removed, id);
            }
            const lastSyncedAt = rows[rows.length - 1].synced_at;
            return { entries, dirty, removed, lastSyncedAt };
          }),

        reset: () => set({ ...EMPTY, ownerId: null }),
      };
    },
    {
      name: 'anime-library',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ entries, dirty, removed, ownerId, lastSyncedAt }) => ({
        entries,
        dirty,
        removed,
        ownerId,
        lastSyncedAt,
      }),
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<LibraryState>;
        if (version < 2) {
          return { ...EMPTY, ...state, dirty: {}, removed: {}, ownerId: null, lastSyncedAt: null };
        }
        return state;
      },
      onRehydrateStorage: () => () => useLibrary.setState({ hydrated: true }),
    }
  )
);

export function useEntry(id: number): LibraryEntry | undefined {
  return useLibrary((s) => s.entries[id]);
}
