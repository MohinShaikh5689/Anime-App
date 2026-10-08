/**
 * Release-aware rules for the library: you can't watch what hasn't aired.
 *
 * Every rule is permissive when airing data is missing (entries saved before
 * it was tracked); `useAiringRefresh` fills it in on the next app open.
 */
import type { ListStatus } from '@/constants/lists';
import type { AnimeSummary } from '@/lib/anilist';

type Airing = Pick<AnimeSummary, 'episodes' | 'airingStatus' | 'airedEpisodes' | 'nextAiringAt'>;

/** Episodes released so far, or null when unknown. */
export function airedCount(a: Airing): number | null {
  if (a.airedEpisodes != null) return a.airedEpisodes;
  if (a.airingStatus === 'NOT_YET_RELEASED') return 0;
  return null;
}

/** Nothing has aired yet. */
export function isUnaired(a: Airing) {
  return airedCount(a) === 0;
}

/** More episodes are still to come. */
export function isStillAiring(a: Airing) {
  if (a.airingStatus === 'RELEASING' || a.airingStatus === 'NOT_YET_RELEASED' || a.airingStatus === 'HIATUS') {
    return true;
  }
  const aired = airedCount(a);
  return aired != null && a.episodes != null && aired < a.episodes;
}

/** The highest episode that can be logged. */
export function maxProgress(a: Airing) {
  return airedCount(a) ?? a.episodes ?? Number.MAX_SAFE_INTEGER;
}

/** Progress reached the final episode of a show that has finished airing. */
export function isComplete(a: Airing, progress: number) {
  return a.episodes != null && a.episodes > 0 && progress >= a.episodes && !isStillAiring(a);
}

/** Every released episode is watched but the show continues. */
export function isCaughtUp(a: Airing, progress: number) {
  return progress >= maxProgress(a) && !isComplete(a, progress);
}

/** Whether the show can move to `status`, and why not. */
export function statusBlock(a: Airing, status: ListStatus): string | null {
  if (status === 'watching' && isUnaired(a)) {
    return a.nextAiringAt
      ? `It premieres ${formatAiring(a.nextAiringAt)}. Save it to your Wishlist until then.`
      : "It hasn't aired yet. Save it to your Wishlist until then.";
  }
  if (status === 'watched' && isStillAiring(a)) {
    return isUnaired(a)
      ? "It hasn't aired yet."
      : 'It is still airing. It moves to Watched on its own once you log the final episode.';
  }
  return null;
}

/** "tomorrow", "in 3 days", "on Oct 14". */
export function formatAiring(at: number, now = Date.now()) {
  const day = 86_400_000;
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  const days = Math.floor((at - startOfToday) / day);
  if (days <= 0) {
    const time = new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `today at ${time}`;
  }
  if (days === 1) return 'tomorrow';
  if (days < 7) return `in ${days} days`;
  return `on ${new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

/** Short label for a show that's caught up: "Ep 8 tomorrow". */
export function nextEpisodeLabel(a: Airing) {
  const aired = airedCount(a);
  if (!a.nextAiringAt || aired == null) return 'Caught up';
  return `Ep ${aired + 1} ${formatAiring(a.nextAiringAt)}`;
}

/** "Premieres tomorrow", or "Not yet aired" when there's no date. */
export function premiereLabel(a: Airing) {
  return a.nextAiringAt ? `Premieres ${formatAiring(a.nextAiringAt)}` : 'Not yet aired';
}
