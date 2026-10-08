/**
 * Minimal client for the public AniList GraphQL API (no API key required).
 * Docs: https://docs.anilist.co
 */

const ENDPOINT = 'https://graphql.anilist.co';

export type AnimeSummary = {
  id: number;
  title: string;
  coverUrl: string | null;
  coverColor: string | null;
  episodes: number | null;
  format: string | null;
  year: number | null;
  averageScore: number | null;
};

export type AnimeDetails = AnimeSummary & {
  nativeTitle: string | null;
  bannerUrl: string | null;
  description: string | null;
  genres: string[];
  status: string | null;
  season: string | null;
  studios: string[];
  duration: number | null;
};

type RawMedia = {
  id: number;
  title: { romaji: string | null; english: string | null; native?: string | null };
  coverImage: { large: string | null; extraLarge?: string | null; color: string | null } | null;
  bannerImage?: string | null;
  episodes: number | null;
  format: string | null;
  seasonYear: number | null;
  season?: string | null;
  averageScore: number | null;
  description?: string | null;
  genres?: string[] | null;
  status?: string | null;
  duration?: number | null;
  studios?: { nodes: { name: string }[] } | null;
};

const SUMMARY_FIELDS = `
  id
  title { romaji english }
  coverImage { large color }
  episodes
  format
  seasonYear
  averageScore
`;

async function request<T>(query: string, variables: Record<string, unknown>, signal?: AbortSignal) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal,
  });
  if (res.status === 429) {
    throw new Error('AniList rate limit reached. Try again in a minute.');
  }
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (!res.ok || json.errors?.length || !json.data) {
    throw new Error(json.errors?.[0]?.message ?? `Request failed (${res.status})`);
  }
  return json.data;
}

function toSummary(m: RawMedia): AnimeSummary {
  return {
    id: m.id,
    title: m.title.english || m.title.romaji || 'Untitled',
    coverUrl: m.coverImage?.extraLarge ?? m.coverImage?.large ?? null,
    coverColor: m.coverImage?.color ?? null,
    episodes: m.episodes,
    format: m.format,
    year: m.seasonYear,
    averageScore: m.averageScore,
  };
}

export async function searchAnime(search: string, signal?: AbortSignal) {
  const data = await request<{ Page: { media: RawMedia[] } }>(
    `query ($search: String) {
      Page(perPage: 30) {
        media(search: $search, type: ANIME, isAdult: false, sort: SEARCH_MATCH) { ${SUMMARY_FIELDS} }
      }
    }`,
    { search },
    signal
  );
  return data.Page.media.map(toSummary);
}

export async function trendingAnime(signal?: AbortSignal) {
  const data = await request<{ Page: { media: RawMedia[] } }>(
    `query {
      Page(perPage: 30) {
        media(type: ANIME, isAdult: false, sort: TRENDING_DESC) { ${SUMMARY_FIELDS} }
      }
    }`,
    {},
    signal
  );
  return data.Page.media.map(toSummary);
}

export async function getAnime(id: number, signal?: AbortSignal): Promise<AnimeDetails> {
  const data = await request<{ Media: RawMedia }>(
    `query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        title { romaji english native }
        coverImage { large extraLarge color }
        bannerImage
        episodes
        format
        season
        seasonYear
        averageScore
        description(asHtml: false)
        genres
        status
        duration
        studios(isMain: true) { nodes { name } }
      }
    }`,
    { id },
    signal
  );
  const m = data.Media;
  return {
    ...toSummary(m),
    nativeTitle: m.title.native ?? null,
    bannerUrl: m.bannerImage ?? null,
    description: m.description ? cleanDescription(m.description) : null,
    genres: m.genres ?? [],
    status: m.status ?? null,
    season: m.season ?? null,
    studios: m.studios?.nodes.map((s) => s.name) ?? [],
    duration: m.duration ?? null,
  };
}

/** AniList descriptions contain light HTML even with asHtml: false. */
function cleanDescription(text: string) {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function formatLabel(format: string | null) {
  if (!format) return null;
  const labels: Record<string, string> = {
    TV: 'TV',
    TV_SHORT: 'TV Short',
    MOVIE: 'Movie',
    SPECIAL: 'Special',
    OVA: 'OVA',
    ONA: 'ONA',
    MUSIC: 'Music',
  };
  return labels[format] ?? format;
}

export function describeAnime(a: Pick<AnimeSummary, 'format' | 'year' | 'episodes'>) {
  return [
    formatLabel(a.format),
    a.year?.toString(),
    a.episodes ? `${a.episodes} ep${a.episodes === 1 ? '' : 's'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Strips detail-only fields so only the summary is persisted in the library. */
export function pickSummary(a: AnimeSummary): AnimeSummary {
  const { id, title, coverUrl, coverColor, episodes, format, year, averageScore } = a;
  return { id, title, coverUrl, coverColor, episodes, format, year, averageScore };
}
