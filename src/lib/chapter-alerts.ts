/**
 * "New chapter" alerts for manga and manhwa in Reading.
 *
 * Unlike anime, chapters aren't announced ahead of time, so there is nothing to
 * schedule. Instead a background task checks every few hours whether each series has
 * a newer chapter than last time and, if so, shows a notification straight away. The
 * same check runs when the app opens. iOS decides exactly when background work runs
 * (usually several times a day for an app you use), so alerts can lag a little.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo';

import { isManga } from '@/lib/anilist';
import { getLatestChapter } from '@/lib/chapters';
import { notifyNow } from '@/lib/notifications';
import { type LibraryEntry, useLibrary } from '@/store/library';
import { useSettings } from '@/store/settings';

type TaskManagerModule = typeof import('expo-task-manager');
type BackgroundTaskModule = typeof import('expo-background-task');

/** Both modules are native; builds made before this feature don't include them. */
const TaskManager: TaskManagerModule | null = requireOptionalNativeModule('ExpoTaskManager')
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('expo-task-manager') as TaskManagerModule)
  : null;
const BackgroundTask: BackgroundTaskModule | null =
  TaskManager && requireOptionalNativeModule('ExpoBackgroundTask')
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('expo-background-task') as BackgroundTaskModule)
    : null;

const TASK = 'tsuzuku-new-chapters';
/** Latest chapter seen per series (AniList id → chapter), stored on the device. */
const SEEN_KEY = 'chapter-alerts-seen';
/** Keeps each run short; background time on iOS is limited. */
const MAX_SERIES = 25;
const FOREGROUND_INTERVAL = 30 * 60_000;
/** Ask for a background run about every 3 hours (iOS treats this as a minimum). */
const BACKGROUND_MINUTES = 180;

function reading(entries: Record<number, LibraryEntry>) {
  return Object.values(entries)
    .filter((e) => e.status === 'watching' && isManga(e))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_SERIES);
}

async function loadSeen(): Promise<Record<string, number>> {
  try {
    return JSON.parse((await AsyncStorage.getItem(SEEN_KEY)) ?? '{}');
  } catch {
    return {};
  }
}

let running: Promise<number> | null = null;
let lastRun = 0;

/**
 * Looks for new chapters in Reading and notifies about each one found. The first
 * check of a series only records where it is, so adding a series doesn't alert.
 * Returns how many alerts were sent.
 */
export function checkNewChapters(force = false): Promise<number> {
  if (running) return running;
  if (!force && Date.now() - lastRun < FOREGROUND_INTERVAL) return Promise.resolve(0);
  running = runCheck()
    .catch(() => 0)
    .finally(() => {
      running = null;
      lastRun = Date.now();
    });
  return running;
}

async function runCheck() {
  // In a background launch the stores haven't loaded from disk yet.
  if (!useLibrary.persist.hasHydrated()) await useLibrary.persist.rehydrate();
  if (!useSettings.persist.hasHydrated()) await useSettings.persist.rehydrate();
  if (!useSettings.getState().episodeAlerts) return 0;

  const series = reading(useLibrary.getState().entries);
  const seen = await loadSeen();
  const next: Record<string, number> = {};
  let sent = 0;

  for (const e of series) {
    const before = seen[e.id];
    const latest = await getLatestChapter({
      id: e.id,
      titles: [e.title],
      country: e.country,
      year: e.year,
      finished: e.airingStatus === 'FINISHED' || e.airingStatus === 'CANCELLED',
    }).catch(() => null);
    if (latest == null) {
      if (before != null) next[e.id] = before;
      continue;
    }
    next[e.id] = Math.max(latest, before ?? 0);
    // Only alert about chapters newer than both the last check and your progress.
    const from = Math.max(before ?? latest, e.progress);
    if (before != null && latest > from) {
      const count = latest - from;
      const ok = await notifyNow(`ch-${e.id}-${latest}`, {
        title: e.title,
        body: count === 1 ? `Chapter ${latest} is out` : `Chapters ${from + 1}–${latest} are out`,
        data: { animeId: e.id },
      });
      if (ok) sent += 1;
    }
  }

  // Series that left Reading are dropped, so re-adding one starts fresh.
  await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(next));
  return sent;
}

if (TaskManager && BackgroundTask && !TaskManager.isTaskDefined(TASK)) {
  TaskManager.defineTask(TASK, async () => {
    try {
      await checkNewChapters(true);
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

/** Registers the background check while alerts are on and something is in Reading. */
export async function syncChapterTask() {
  if (!TaskManager || !BackgroundTask) return;
  try {
    const wanted = useSettings.getState().episodeAlerts && reading(useLibrary.getState().entries).length > 0;
    const registered = await TaskManager.isTaskRegisteredAsync(TASK);
    if (wanted && !registered) {
      await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: BACKGROUND_MINUTES });
    } else if (!wanted && registered) {
      await BackgroundTask.unregisterTaskAsync(TASK);
    }
  } catch {
    // Background tasks unavailable (e.g. Low Power Mode); the foreground check still runs.
  }
}

export const chapterAlertsSupported = BackgroundTask != null;
