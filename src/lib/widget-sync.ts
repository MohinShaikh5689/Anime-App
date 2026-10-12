/**
 * Keeps the "Up Next" widget (src/widgets/up-next.tsx) in step with the library.
 *
 * The widget can't reach the network or the app's storage, so the app hands it
 * everything: the shows in Watching, the next episode of each and when it airs, and
 * each cover downloaded into the directory the app and widget share. A timeline entry is
 * scheduled at every upcoming air time, so the widget flips a show to "Out now" on time
 * even when the app isn't running.
 */
import { requireOptionalNativeModule } from 'expo';
import { Directory, File } from 'expo-file-system';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { create } from 'zustand';

import { airedCount, isComplete } from '@/lib/airing';
import { isManga } from '@/lib/anilist';
import { showAccent } from '@/lib/color';
import { type LibraryEntry, useLibrary } from '@/store/library';
import { type UpNextItem, UpNextLayout, type UpNextProps } from '@/widgets/up-next';

type WidgetsModule = typeof import('expo-widgets');

/** Widgets are iOS-only and need the native module, which older builds don't have. */
const Widgets: WidgetsModule | null =
  Platform.OS === 'ios' && requireOptionalNativeModule('ExpoWidgets')
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('expo-widgets') as WidgetsModule)
    : null;

/** The app group the native side resolved (it can differ from app.json after sideloading). */
const nativeWidgets = Widgets ? (requireOptionalNativeModule('ExpoWidgets') as { appGroupIdentifier?: string | null }) : null;
export const widgetAppGroup = nativeWidgets?.appGroupIdentifier ?? null;
/** Whether the app can open the folder it shares with the widget. */
export const widgetContainerReachable = !!Widgets?.widgetsDirectory;

const upNext = Widgets?.createWidget<UpNextProps>('UpNext', UpNextLayout) ?? null;

const MAX_ITEMS = 8;
/** WidgetKit only needs entries for the near future; the app refreshes on every open. */
const TIMELINE_DAYS = 7;
const MAX_ENTRIES = 15;
const FALLBACK_COLOR = '#5B47F0';

/** The next episode for each show in Watching, or nothing once you've caught up. */
export function upNextItems(entries: Record<number, LibraryEntry>): Omit<UpNextItem, 'cover'>[] {
  const items: Omit<UpNextItem, 'cover'>[] = [];
  for (const e of Object.values(entries)) {
    if (e.status !== 'watching' || isManga(e) || isComplete(e, e.progress)) continue;
    const episode = e.progress + 1;
    if (e.episodes != null && episode > e.episodes) continue;
    const aired = airedCount(e);
    let airingAt: number | null = null;
    let behind = 1;
    if (aired != null && episode <= aired) {
      behind = aired - e.progress;
    } else if (aired != null && episode === aired + 1 && e.nextAiringAt) {
      airingAt = e.nextAiringAt;
      behind = 0;
    } else if (aired != null) {
      // Caught up with nothing scheduled (a break between cours, say).
      continue;
    }
    items.push({
      id: e.id,
      title: e.title,
      color: showAccent(e.coverColor, FALLBACK_COLOR),
      episode,
      airingAt,
      behind,
      progress: e.progress,
      total: e.episodes,
      touched: e.updatedAt,
    });
  }
  const now = Date.now();
  return items
    .sort((a, b) => {
      const aOut = a.airingAt == null || a.airingAt <= now;
      const bOut = b.airingAt == null || b.airingAt <= now;
      if (aOut !== bOut) return aOut ? -1 : 1;
      return aOut ? b.touched - a.touched : (a.airingAt ?? 0) - (b.airingAt ?? 0);
    })
    .slice(0, MAX_ITEMS);
}

/** AniList's medium cover is plenty for a widget and keeps its memory use small. */
function smallCover(url: string) {
  return url.replace('/cover/large/', '/cover/medium/').replace('/cover/extraLarge/', '/cover/medium/');
}

/** Saves covers into the shared directory and removes ones no longer shown. */
async function syncCovers(entries: Record<number, LibraryEntry>, ids: number[]) {
  const covers = new Map<number, string>();
  const path = Widgets?.widgetsDirectory;
  // Null when the app can't reach the shared app group container.
  if (!path) return covers;
  const dir = new Directory(path);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const keep = new Set(ids.map((id) => `cover-${id}.jpg`));

  await Promise.all(
    ids.map(async (id) => {
      const url = entries[id]?.coverUrl;
      if (!url) return;
      const file = new File(dir, `cover-${id}.jpg`);
      try {
        if (!file.exists) await File.downloadFileAsync(smallCover(url), file);
        covers.set(id, file.uri);
      } catch {
        // No cover this time; the row still shows its title and status.
      }
    })
  );

  for (const item of dir.list()) {
    if (item instanceof File && item.name.startsWith('cover-') && !keep.has(item.name)) {
      try {
        item.delete();
      } catch {
        // Ignore; it's only a cache.
      }
    }
  }
  return covers;
}

type WidgetStatus = { at: number | null; shows: number; covers: number; error: string | null };

/** The outcome of the last sync, shown on the Account screen. */
export const useWidgetStatus = create<WidgetStatus>()(() => ({ at: null, shows: 0, covers: 0, error: null }));

let lastKey = '';
let running: Promise<void> | null = null;

/** Rebuilds the widget's timeline from the library. Safe to call often. */
export function syncWidget(force = false) {
  if (!upNext) return Promise.resolve();
  if (running) return running;
  running = (async () => {
    const entries = useLibrary.getState().entries;
    const base = upNextItems(entries);
    // Covers are a nice-to-have: a failure here must never keep the timeline from being written.
    let covers = new Map<number, string>();
    let coverError: string | null = null;
    try {
      covers = await syncCovers(entries, base.map((i) => i.id));
    } catch (e) {
      coverError = e instanceof Error ? e.message : String(e);
    }
    const items: UpNextItem[] = base.map((i) => ({ ...i, cover: covers.get(i.id) ?? null }));

    const key = JSON.stringify(items);
    if (!force && key === lastKey) return;

    // The timeline is stored in UserDefaults, which can't hold null (NSNull): leave those
    // keys out instead. The layout treats a missing value like null.
    const props = JSON.parse(JSON.stringify({ items }, (_, v) => (v === null ? undefined : v))) as UpNextProps;
    const now = Date.now();
    const horizon = now + TIMELINE_DAYS * 86_400_000;
    // One entry now and one at each air time, so the widget re-renders as episodes come out.
    const times = [
      now,
      ...new Set(items.map((i) => i.airingAt).filter((t): t is number => t != null && t > now && t < horizon)),
    ]
      .sort((a, b) => a - b)
      .slice(0, MAX_ENTRIES);
    upNext.updateTimeline(times.map((t) => ({ date: new Date(t), props })));
    lastKey = key;
    useWidgetStatus.setState({
      at: Date.now(),
      shows: items.length,
      covers: covers.size,
      error: coverError && `Covers: ${coverError}`,
    });
  })()
    .catch((e) => {
      // The widget keeps its previous timeline.
      useWidgetStatus.setState({ at: Date.now(), error: e instanceof Error ? e.message : String(e) });
    })
    .finally(() => {
      running = null;
    });
  return running;
}

export const widgetsSupported = upNext != null;

/** Keeps the widget current while signed in. Mount once inside the signed-in UI. */
export function useWidgetSync() {
  useEffect(() => {
    if (!upNext) return;
    syncWidget(true);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useLibrary.subscribe((state, prev) => {
      if (state.entries === prev.entries) return;
      clearTimeout(timer);
      timer = setTimeout(() => syncWidget(), 1500);
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncWidget();
    });
    return () => {
      unsubscribe();
      appState.remove();
      clearTimeout(timer);
    };
  }, []);
}
