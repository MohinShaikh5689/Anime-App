/**
 * Two-way sync between the on-device library (source of truth for the UI, works offline)
 * and `public.library_entries` in Supabase. Last write wins per anime, using `updated_at`.
 *
 * 1. Push: upsert entries changed on this device, and soft-delete removed ones.
 * 2. Pull: fetch rows changed on the server since the last pull (`synced_at` watermark).
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import { type RemoteEntry, toRemote, useLibrary } from '@/store/library';

type SyncStatus = { syncing: boolean; error: string | null; lastSyncAt: number | null };

export const useSyncStatus = create<SyncStatus>()(() => ({
  syncing: false,
  error: null,
  lastSyncAt: null,
}));

const PAGE = 500;
let running: Promise<void> | null = null;
let rerun = false;

/** Runs a sync; concurrent calls coalesce into one follow-up run. */
export function syncLibrary(): Promise<void> {
  if (running) {
    rerun = true;
    return running;
  }
  running = (async () => {
    useSyncStatus.setState({ syncing: true });
    try {
      do {
        rerun = false;
        await syncOnce();
      } while (rerun);
      useSyncStatus.setState({ error: null, lastSyncAt: Date.now() });
    } catch (e) {
      useSyncStatus.setState({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      useSyncStatus.setState({ syncing: false });
      running = null;
    }
  })();
  return running;
}

async function syncOnce() {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return;

  const library = useLibrary.getState();
  if (library.ownerId !== userId) return;

  // Push
  const pushed = Object.keys(library.dirty)
    .map((id) => library.entries[Number(id)])
    .filter((e) => e !== undefined);
  if (pushed.length > 0) {
    const { error } = await supabase
      .from('library_entries')
      .upsert(
        pushed.map((e) => toRemote(e, userId)),
        { onConflict: 'user_id,anime_id' }
      );
    if (error) throw error;
  }

  const removed = Object.entries(library.removed).map(([id, at]) => ({ id: Number(id), at }));
  for (const r of removed) {
    const at = new Date(r.at).toISOString();
    const { error } = await supabase
      .from('library_entries')
      .update({ deleted_at: at, updated_at: at })
      .eq('user_id', userId)
      .eq('anime_id', r.id);
    if (error) throw error;
  }

  useLibrary.getState().markPushed(
    pushed.map((e) => ({ id: e.id, updatedAt: e.updatedAt })),
    removed
  );

  // Pull. Rows written in one transaction share a synced_at, so page by offset from a
  // fixed watermark (>=) rather than by timestamp; re-applying a row is harmless.
  const since = useLibrary.getState().lastSyncedAt;
  for (let offset = 0; ; offset += PAGE) {
    let query = supabase
      .from('library_entries')
      .select('*')
      .eq('user_id', userId)
      .order('synced_at', { ascending: true })
      .order('anime_id', { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (since) query = query.gte('synced_at', since);
    const { data: rows, error } = await query.returns<RemoteEntry[]>();
    if (error) throw error;
    // Stop if the user signed out or switched accounts while we were waiting.
    if (useLibrary.getState().ownerId !== userId) return;
    useLibrary.getState().applyRemote(rows ?? []);
    if (!rows || rows.length < PAGE) break;
  }
}

/** Keeps the library in sync for the signed-in user. Mount once inside the signed-in UI. */
export function useLibrarySync(userId: string) {
  useEffect(() => {
    useLibrary.getState().claim(userId);
    syncLibrary();

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncLibrary();
    });

    // Push local edits shortly after they happen.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useLibrary.subscribe((state, prev) => {
      if (state.dirty === prev.dirty && state.removed === prev.removed) return;
      if (Object.keys(state.dirty).length === 0 && Object.keys(state.removed).length === 0) return;
      clearTimeout(timer);
      timer = setTimeout(syncLibrary, 1500);
    });

    return () => {
      appState.remove();
      unsubscribe();
      clearTimeout(timer);
    };
  }, [userId]);
}
