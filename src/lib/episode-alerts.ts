/**
 * "New episode" alerts for shows in Watching, as scheduled local notifications.
 *
 * AniList publishes air times for the rest of a season in advance, so the phone can
 * schedule every upcoming episode itself: no push server, and alerts still fire if the
 * app isn't opened for weeks. The schedule is rebuilt whenever the app opens, returns
 * to the foreground, or the Watching list changes, which also picks up delays.
 */
import { type Href, router } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { getAiringSchedules, isManga } from '@/lib/anilist';
import { checkNewChapters, syncChapterTask } from '@/lib/chapter-alerts';
import { CHANNEL, ensureChannel, hasPermission, Notifications, requestAlertPermission } from '@/lib/notifications';
import { useLibrary } from '@/store/library';
import { useSettings } from '@/store/settings';

const REFRESH_INTERVAL = 30 * 60_000;
/** iOS keeps at most 64 pending local notifications per app; leave a little room. */
const MAX_SCHEDULED = 60;

let running: Promise<void> | null = null;
let lastRun = 0;

/** Rebuilds the schedule from the Watching list. Safe to call often. */
export function refreshEpisodeAlerts(force = false) {
  if (!Notifications) return Promise.resolve();
  if (running) return running;
  if (!force && Date.now() - lastRun < REFRESH_INTERVAL) return Promise.resolve();
  running = rebuild()
    .catch(() => {
      // Offline or rate limited: the existing schedule stays until the next refresh.
    })
    .finally(() => {
      running = null;
    });
  return running;
}

async function rebuild() {
  const N = Notifications!;
  const { episodeAlerts } = useSettings.getState();
  if (!episodeAlerts || !(await hasPermission())) {
    await cancelEpisodeAlerts();
    lastRun = Date.now();
    return;
  }

  const watching = Object.values(useLibrary.getState().entries).filter(
    (e) => e.status === 'watching' && !isManga(e)
  );
  const schedule = watching.length ? await getAiringSchedules(watching.map((e) => e.id)) : [];
  const soon = Date.now() + 60_000;
  const upcoming = schedule
    .filter((s) => s.airingAt > soon)
    .sort((a, b) => a.airingAt - b.airingAt)
    .slice(0, MAX_SCHEDULED);

  await ensureChannel();
  // A full rebuild is simplest and also drops alerts for shows that left Watching
  // or episodes that were rescheduled.
  await cancelEpisodeAlerts();
  for (const s of upcoming) {
    await N.scheduleNotificationAsync({
      identifier: `ep-${s.animeId}-${s.episode}`,
      content: {
        title: s.title,
        body: `Episode ${s.episode} is out now`,
        data: { animeId: s.animeId },
        sound: 'default',
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DATE,
        date: s.airingAt,
        channelId: CHANNEL,
      },
    });
  }
  lastRun = Date.now();
}

const isEpisodeAlert = (id: string) => id.startsWith('ep-');

/** Cancels scheduled episode alerts, leaving anything else (like a test alert) alone. */
async function cancelEpisodeAlerts() {
  const N = Notifications!;
  const pending = await N.getAllScheduledNotificationsAsync();
  await Promise.all(
    pending.filter((r) => isEpisodeAlert(r.identifier)).map((r) => N.cancelScheduledNotificationAsync(r.identifier))
  );
}

/** How many episode alerts are currently scheduled. */
export async function scheduledAlertCount() {
  if (!Notifications) return 0;
  return (await Notifications.getAllScheduledNotificationsAsync()).filter((r) => isEpisodeAlert(r.identifier))
    .length;
}

/**
 * Sends a sample alert in a few seconds, styled like a real one for a show you're
 * watching, so you can check notifications work (lock the phone to see it there).
 */
export async function sendTestAlert(delaySeconds = 5) {
  if (!Notifications || !(await requestAlertPermission())) return false;
  const watching = Object.values(useLibrary.getState().entries)
    .filter((e) => e.status === 'watching' && !isManga(e))
    .sort((a, b) => (a.nextAiringAt ?? Infinity) - (b.nextAiringAt ?? Infinity));
  const show = watching[0];
  await Notifications.scheduleNotificationAsync({
    identifier: 'test-alert',
    content: {
      title: show?.title ?? 'Tsuzuku',
      body: show ? `Episode ${show.progress + 1} is out now (test alert)` : 'New episode alerts are working',
      data: show ? { animeId: show.id } : {},
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: delaySeconds,
      channelId: CHANNEL,
    },
  });
  return true;
}

/** IDs of titles in Watching/Reading, as a stable string for change detection. */
function watchingKey() {
  return Object.values(useLibrary.getState().entries)
    .filter((e) => e.status === 'watching')
    .map((e) => e.id)
    .sort((a, b) => a - b)
    .join(',');
}

function openAnime(response: import('expo-notifications').NotificationResponse | null | undefined) {
  const id = response?.notification.request.content.data?.animeId;
  if (typeof id === 'number') router.push(`/(home)/anime/${id}` as Href);
}

/**
 * Keeps alerts scheduled for the signed-in user and opens the show when an alert is
 * tapped. Mount once inside the signed-in UI.
 */
export function useEpisodeAlerts() {
  useEffect(() => {
    const N = Notifications;
    if (!N) return;

    // Ask once, the first time there's something to be alerted about.
    const maybeAsk = async () => {
      const { episodeAlerts, askedForAlerts, markAskedForAlerts } = useSettings.getState();
      if (!episodeAlerts || askedForAlerts || !watchingKey()) return;
      markAskedForAlerts();
      await requestAlertPermission();
      refreshEpisodeAlerts(true);
    };

    maybeAsk();
    refreshEpisodeAlerts(true);
    syncChapterTask();
    checkNewChapters();

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshEpisodeAlerts();
        checkNewChapters();
      }
    });

    // Reschedule shortly after the Watching list changes.
    let key = watchingKey();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useLibrary.subscribe((state, prev) => {
      if (state.entries === prev.entries && state.hydrated === prev.hydrated) return;
      const next = watchingKey();
      if (next === key) return;
      key = next;
      clearTimeout(timer);
      timer = setTimeout(() => {
        maybeAsk();
        refreshEpisodeAlerts(true);
        syncChapterTask();
      }, 2000);
    });

    // Opening the app from an alert, then taps while it's running.
    const last = N.getLastNotificationResponse();
    if (last) {
      openAnime(last);
      N.clearLastNotificationResponse();
    }
    const tap = N.addNotificationResponseReceivedListener(openAnime);

    return () => {
      appState.remove();
      unsubscribe();
      clearTimeout(timer);
      tap.remove();
    };
  }, []);
}

export { alertsSupported, requestAlertPermission } from '@/lib/notifications';
