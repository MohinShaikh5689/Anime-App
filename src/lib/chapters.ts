/**
 * Chapter release history for manga, manhwa and manhua. AniList has no per-chapter
 * data, so it is combined from two public sources:
 *
 * - MangaDex (https://api.mangadex.org): chapter uploads in every language. Some
 *   translation usually appears within days of a chapter's release, so the earliest
 *   upload is a good stand-in for the release date, even for licensed series that
 *   English fan groups stopped translating.
 * - MangaUpdates (https://api.mangaupdates.com): English release history and the
 *   series' latest chapter.
 *
 * Titles are matched through MangaDex, whose entries link an AniList id and a
 * MangaUpdates id; a title search on MangaUpdates is the fallback.
 */

const MANGADEX = 'https://api.mangadex.org';
const MANGAUPDATES = 'https://api.mangaupdates.com/v1';
const PER_PAGE = 100;
/** MangaDex's maximum page size; uploads in many languages share one page. */
const MD_PAGE = 500;
const DAY = 86_400_000;

export type ChapterTarget = {
  id: number;
  titles: string[];
  country: string | null | undefined;
  year: number | null;
  /** AniList says the series is finished, so no next chapter is expected. */
  finished: boolean;
};

type Sources = { mangadex: string | null; mangaupdates: number | null };

export type ChapterData = {
  sources: Sources;
  /** Chapter number → first release date (ms). */
  dates: Record<number, number>;
  latest: number | null;
  latestAt: number | null;
  /** Typical days between chapters, when releases are regular. */
  cadenceDays: number | null;
  nextExpectedAt: number | null;
  /** Pages loaded so far from each source. */
  muPage: number;
  mdOffset: number;
  muMore: boolean;
  mdMore: boolean;
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

const seriesIds = new Map<number, Sources>();

/** The series on MangaDex and MangaUpdates for an AniList title. */
async function findSeries(target: ChapterTarget, signal?: AbortSignal): Promise<Sources> {
  const known = seriesIds.get(target.id);
  if (known) return known;

  let mangadex: string | null = null;
  let found: number | null = null;
  // 1. MangaDex links AniList ids to MangaUpdates ids (new-style, base 36).
  for (const title of target.titles) {
    const md = await json<{ data: { id: string; attributes: { links: Record<string, string> | null } }[] }>(
      `${MANGADEX}/manga?limit=10&title=${encodeURIComponent(title)}`,
      { signal }
    ).catch(() => null);
    const match = md?.data.find((m) => m.attributes.links?.al === String(target.id));
    if (!match) continue;
    mangadex = match.id;
    const mu = match.attributes.links?.mu;
    if (mu && /[a-z]/i.test(mu)) found = parseInt(mu, 36);
    break;
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

  const sources = { mangadex, mangaupdates: found };
  seriesIds.set(target.id, sources);
  return sources;
}

/** Chapter numbers a release covers: "12", "12.5" (skipped), "10-12". */
function chaptersIn(label: string): number[] {
  const range = label.match(/(\d+)\s*-\s*(\d+)/);
  if (range) {
    const [from, to] = [Number(range[1]), Number(range[2])];
    if (to >= from && to - from < 50) return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }
  // Whole chapters only; side chapters like "12.5" are skipped.
  const single = label.match(/^\s*(\d+)\s*$/);
  return single && Number(single[1]) > 0 ? [Number(single[1])] : [];
}

type Dated = { chapter: string; at: number };

async function muReleases(seriesId: number, page: number, signal?: AbortSignal) {
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
  return {
    items: res.results.map((r): Dated => ({ chapter: r.record.chapter, at: Date.parse(r.record.release_date) })),
    more: page * PER_PAGE < res.total_hits,
  };
}

/** The series' latest chapter according to MangaUpdates (counts licensed releases too). */
async function muLatest(seriesId: number, signal?: AbortSignal) {
  const res = await json<{ latest_chapter: number | null }>(`${MANGAUPDATES}/series/${seriesId}`, { signal });
  return res.latest_chapter ?? null;
}

async function mdUploads(mangaId: string, offset: number, signal?: AbortSignal) {
  const res = await json<{ total: number; data: { attributes: { chapter: string | null; publishAt: string } }[] }>(
    `${MANGADEX}/manga/${mangaId}/feed?limit=${MD_PAGE}&offset=${offset}&order[chapter]=desc&order[publishAt]=asc`,
    { signal }
  );
  const now = Date.now();
  return {
    items: res.data
      .filter((c) => c.attributes.chapter != null)
      .map((c): Dated => ({ chapter: c.attributes.chapter!, at: Date.parse(c.attributes.publishAt) }))
      // Scheduled uploads aren't out yet.
      .filter((c) => c.at <= now),
    more: offset + MD_PAGE < res.total,
  };
}

function merge(dates: Record<number, number>, items: Dated[]) {
  const next = { ...dates };
  for (const { chapter, at } of items) {
    if (Number.isNaN(at)) continue;
    for (const n of chaptersIn(chapter)) {
      // Many groups and languages release the same chapter; the first release counts.
      if (next[n] === undefined || at < next[n]) next[n] = at;
    }
  }
  return next;
}

function summarize(
  base: Pick<ChapterData, 'sources' | 'muPage' | 'mdOffset' | 'muMore' | 'mdMore'>,
  dates: Record<number, number>,
  knownLatest: number | null,
  finished: boolean
): ChapterData {
  const numbers = Object.keys(dates)
    .map(Number)
    .sort((a, b) => b - a);
  const datedLatest = numbers[0] ?? null;
  const latest = Math.max(datedLatest ?? 0, knownLatest ?? 0) || null;
  const latestAt = latest != null ? (dates[latest] ?? null) : null;

  // Median gap across the most recent dated chapters.
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

  return {
    ...base,
    dates,
    latest,
    latestAt,
    cadenceDays,
    nextExpectedAt,
    hasMore: base.muMore || base.mdMore,
  };
}

const none = { items: [] as Dated[], more: false };

/** Latest chapters and release rhythm for a series, or null when it can't be found. */
export async function getChapters(target: ChapterTarget, signal?: AbortSignal): Promise<ChapterData | null> {
  const sources = await findSeries(target, signal);
  if (!sources.mangadex && sources.mangaupdates == null) return null;
  const mu = sources.mangaupdates;
  // Each source is optional; one failing still leaves the other.
  const [md, releases, latest] = await Promise.all([
    sources.mangadex ? mdUploads(sources.mangadex, 0, signal).catch(() => none) : none,
    mu != null ? muReleases(mu, 1, signal).catch(() => none) : none,
    mu != null ? muLatest(mu, signal).catch(() => null) : null,
  ]);
  const dates = merge(merge({}, md.items), releases.items);
  if (Object.keys(dates).length === 0 && latest == null) return null;
  return summarize(
    { sources, muPage: 1, mdOffset: 0, muMore: releases.more, mdMore: md.more },
    dates,
    latest,
    target.finished
  );
}

/** Loads the next page of older releases from each source that has more. */
export async function loadOlderChapters(data: ChapterData, finished: boolean, signal?: AbortSignal) {
  const { mangadex, mangaupdates } = data.sources;
  const mdOffset = data.mdMore ? data.mdOffset + MD_PAGE : data.mdOffset;
  const muPage = data.muMore ? data.muPage + 1 : data.muPage;
  const [md, releases] = await Promise.all([
    data.mdMore && mangadex ? mdUploads(mangadex, mdOffset, signal) : none,
    data.muMore && mangaupdates != null ? muReleases(mangaupdates, muPage, signal) : none,
  ]);
  const dates = merge(merge(data.dates, md.items), releases.items);
  return summarize(
    { sources: data.sources, muPage, mdOffset, muMore: data.muMore && releases.more, mdMore: data.mdMore && md.more },
    dates,
    data.latest,
    finished
  );
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
