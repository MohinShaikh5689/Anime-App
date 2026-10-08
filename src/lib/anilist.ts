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

export type BrowseOptions = {
  search?: string;
  genre?: string;
  season?: Season;
  seasonYear?: number;
  sort?: 'SEARCH_MATCH' | 'TRENDING_DESC' | 'POPULARITY_DESC' | 'SCORE_DESC';
  perPage?: number;
};

export type Season = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';

/** Search or browse AniList: free-text search, genre, season and sort combine freely. */
export async function browseAnime(options: BrowseOptions, signal?: AbortSignal) {
  const { search, genre, season, seasonYear, perPage = 30 } = options;
  const sort = options.sort ?? (search ? 'SEARCH_MATCH' : 'POPULARITY_DESC');
  const data = await request<{ Page: { media: RawMedia[] } }>(
    `query ($search: String, $genre: String, $season: MediaSeason, $seasonYear: Int, $sort: [MediaSort], $perPage: Int) {
      Page(perPage: $perPage) {
        media(search: $search, genre: $genre, season: $season, seasonYear: $seasonYear, sort: $sort, type: ANIME, isAdult: false) { ${SUMMARY_FIELDS} }
      }
    }`,
    { search, genre, season, seasonYear, sort: [sort], perPage },
    signal
  );
  return data.Page.media.map(toSummary);
}

export function currentSeason(date = new Date()): { season: Season; seasonYear: number } {
  const month = date.getMonth();
  const season: Season =
    month < 3 ? 'WINTER' : month < 6 ? 'SPRING' : month < 9 ? 'SUMMER' : 'FALL';
  return { season, seasonYear: date.getFullYear() };
}

export const GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Mystery',
  'Sports',
  'Psychological',
  'Supernatural',
  'Mecha',
  'Horror',
  'Music',
] as const;

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
