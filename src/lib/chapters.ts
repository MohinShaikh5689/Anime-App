/**
 * Chapter release history for manga, manhwa and manhua. AniList has no per-chapter
 * data, so releases come from MangaUpdates (https://api.mangaupdates.com), which logs
 * every chapter release with its date. Titles are matched through MangaDex, whose
 * entries link both an AniList id and a MangaUpdates id; a title search on
 * MangaUpdates is the fallback.
 */

const MANGADEX = 'https://api.mangadex.org';
const MANGAUPDATES = 'https://api.mangaupdates.com/v1';
const PER_PAGE = 100;
const DAY = 86_400_000;

export type ChapterTarget = {
  id: number;
  titles: string[];
  country: string | null | undefined;
  year: number | null;
  /** AniList says the series is finished, so no next chapter is expected. */
  finished: boolean;
};

export type ChapterData = {
  seriesId: number;
  /** Chapter number → first release date (ms). */
  dates: Record<number, number>;
  latest: number | null;
  latestAt: number | null;
  /** Typical days between chapters, when releases are regular. */
  cadenceDays: number | null;
  nextExpectedAt: number | null;
  page: number;
  hasMore: boolean;
};

type MuRelease = { record: { chapter: string; release_date: string } };

async function json<T>(url: string, init: RequestInit & { signal?: AbortSignal } = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init.headers },
  });
  if (!res.ok) throw new Error(`Chapter service error (${res.status})`);
  return (await res.json()) as T;
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

const MU_TYPE: Record<string, string> = { KR: 'Manhwa', CN: 'Manhua', TW: 'Manhua', JP: 'Manga' };

const seriesIds = new Map<number, number | null>();

/** MangaUpdates series id for an AniList title, or null when there's no match. */
async function findSeries(target: ChapterTarget, signal?: AbortSignal): Promise<number | null> {
  if (seriesIds.has(target.id)) return seriesIds.get(target.id) ?? null;

  let found: number | null = null;
  // 1. MangaDex links AniList ids to MangaUpdates ids (new-style, base 36).
  for (const title of target.titles) {
    const md = await json<{ data: { attributes: { links: Record<string, string> | null } }[] }>(
      `${MANGADEX}/manga?limit=10&title=${encodeURIComponent(title)}`,
      { signal }
    ).catch(() => null);
    const match = md?.data.find((m) => m.attributes.links?.al === String(target.id));
    const mu = match?.attributes.links?.mu;
    if (mu && /[a-z]/i.test(mu)) {
      found = parseInt(mu, 36);
      break;
    }
    if (match) break;
  }

  // 2. Title search on MangaUpdates, checked against type and year.
  if (found == null) {
    const wantType = MU_TYPE[target.country ?? 'JP'];
    const wanted = new Set(target.titles.map(normalize));
    for (const title of target.titles) {
      const res = await json<{
        results: { record: { series_id: number; title: string; type: string; year: string } }[];
      }>(`${MANGAUPDATES}/series/search`, {
        method: 'POST',
        body: JSON.stringify({ search: title, perpage: 10 }),
        signal,
      }).catch(() => null);
      const records = res?.results.map((r) => r.record) ?? [];
      const yearOk = (y: string) => !target.year || Math.abs(Number(y) - target.year) <= 1;
      const pick =
        records.find((r) => wanted.has(normalize(r.title)) && r.type === wantType && yearOk(r.year)) ??
        records.find((r) => wanted.has(normalize(r.title)) && r.type === wantType);
      if (pick) {
        found = pick.series_id;
        break;
      }
    }
  }

  seriesIds.set(target.id, found);
  return found;
}

/** Chapter numbers a release covers: "12", "12.5" (skipped), "10-12". */
function chaptersIn(label: string): number[] {
  const range = label.match(/(\d+)\s*-\s*(\d+)/);
  if (range) {
    const [from, to] = [Number(range[1]), Number(range[2])];
    if (to >= from && to - from < 50) return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }
  const single = label.match(/^\s*(\d+)\s*$/);
  return single ? [Number(single[1])] : [];
}

async function releasesPage(seriesId: number, page: number, signal?: AbortSignal) {
  const res = await json<{ total_hits: number; results: MuRelease[] }>(`${MANGAUPDATES}/releases/search`, {
    method: 'POST',
    body: JSON.stringify({
      search: String(seriesId),
      search_type: 'series',
      perpage: PER_PAGE,
      page,
      orderby: 'date',
      asc: 'desc',
    }),
    signal,
  });
  return { releases: res.results, hasMore: page * PER_PAGE < res.total_hits };
}

function merge(dates: Record<number, number>, releases: MuRelease[]) {
  const next = { ...dates };
  for (const { record } of releases) {
    const at = Date.parse(record.release_date);
    if (Number.isNaN(at)) continue;
    for (const n of chaptersIn(record.chapter)) {
      // Several groups release the same chapter; the first release counts.
      if (next[n] === undefined || at < next[n]) next[n] = at;
    }
  }
  return next;
}

function summarize(
  seriesId: number,
  dates: Record<number, number>,
  page: number,
  hasMore: boolean,
  finished: boolean
): ChapterData {
  const numbers = Object.keys(dates)
    .map(Number)
    .sort((a, b) => b - a);
  const latest = numbers[0] ?? null;
  const latestAt = latest != null ? dates[latest] : null;

  // Median gap across the most recent chapters.
  const recent = numbers.slice(0, 9).map((n) => dates[n]);
  const gaps = recent
    .slice(0, -1)
    .map((at, i) => (at - recent[i + 1]) / DAY)
    .filter((g) => g > 0)
    .sort((a, b) => a - b);
  const median = gaps.length >= 3 ? gaps[Math.floor(gaps.length / 2)] : null;
  const cadenceDays = median != null && median <= 31 ? Math.max(1, Math.round(median)) : null;

  let nextExpectedAt: number | null = null;
  if (!finished && cadenceDays && latestAt) {
    nextExpectedAt = latestAt + cadenceDays * DAY;
    // Long overdue usually means a break; don't promise a date.
    if (Date.now() - nextExpectedAt > cadenceDays * 2 * DAY) nextExpectedAt = null;
  }

  return { seriesId, dates, latest, latestAt, cadenceDays, nextExpectedAt, page, hasMore };
}

/** Latest chapters and release rhythm for a series, or null when it can't be found. */
export async function getChapters(target: ChapterTarget, signal?: AbortSignal): Promise<ChapterData | null> {
  const seriesId = await findSeries(target, signal);
  if (seriesId == null) return null;
  const { releases, hasMore } = await releasesPage(seriesId, 1, signal);
  return summarize(seriesId, merge({}, releases), 1, hasMore, target.finished);
}

/** Loads the next page of older releases. */
export async function loadOlderChapters(data: ChapterData, finished: boolean, signal?: AbortSignal) {
  const page = data.page + 1;
  const { releases, hasMore } = await releasesPage(data.seriesId, page, signal);
  return summarize(data.seriesId, merge(data.dates, releases), page, hasMore, finished);
}

/** "Today", "Yesterday", "3 days ago", "Oct 7, 2026". */
export function formatReleased(at: number, now = Date.now()) {
  const days = Math.floor((new Date(now).setHours(0, 0, 0, 0) - new Date(at).setHours(0, 0, 0, 0)) / DAY);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** "in 3 days", "tomorrow", "today", or "any day now" once it's due. */
export function formatExpected(at: number, now = Date.now()) {
  const days = Math.round((new Date(at).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / DAY);
  if (days < 0) return 'any day now';
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days < 7) return `in ${days} days`;
  return `on ${new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

export function cadenceLabel(days: number) {
  if (days === 1) return 'Daily';
  if (days === 7) return 'Weekly';
  if (days === 14) return 'Every two weeks';
  if (days >= 28 && days <= 31) return 'Monthly';
  return `Every ${days} days`;
}

export function isNew(at: number, now = Date.now()) {
  return now - at < 7 * DAY;
}
