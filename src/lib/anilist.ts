/**
 * Minimal client for the public AniList GraphQL API (no API key required).
 * Docs: https://docs.anilist.co
 */

const ENDPOINT = 'https://graphql.anilist.co';

export type MediaType = 'ANIME' | 'MANGA';

/** What the user browses and tracks: anime, or comics split by country of origin. */
export type MediaKind = 'anime' | 'manga' | 'manhwa';

export type AnimeSummary = {
  id: number;
  /** AniList media type; missing on entries saved before manga support (they're anime). */
  type?: MediaType;
  /** Country of origin (JP, KR, CN, TW), which tells manga from manhwa and manhua. */
  country?: string | null;
  title: string;
  coverUrl: string | null;
  coverColor: string | null;
  /** Wide key art (AniList banner); not every title has one. */
  bannerUrl?: string | null;
  /** Total episodes (anime) or chapters (manga), when known. */
  episodes: number | null;
  /** AniList release status: FINISHED, RELEASING, NOT_YET_RELEASED, CANCELLED, HIATUS. */
  airingStatus?: string | null;
  /** Episodes released so far, when known (0 for unreleased shows). */
  airedEpisodes?: number | null;
  /** When the next episode airs (ms since epoch), for airing shows. */
  nextAiringAt?: number | null;
  format: string | null;
  year: number | null;
  averageScore: number | null;
};

export type AnimeDetails = AnimeSummary & {
  nativeTitle: string | null;
  /** English and romaji titles, for matching on other services. */
  titles: string[];
  bannerUrl: string | null;
  description: string | null;
  genres: string[];
  status: string | null;
  season: string | null;
  studios: string[];
  /** Story and art credits (manga). */
  authors: string[];
  volumes: number | null;
  duration: number | null;
  characters: CharacterSummary[];
};

export type CharacterSummary = {
  id: number;
  name: string;
  image: string | null;
  role: 'MAIN' | 'SUPPORTING' | 'BACKGROUND';
  voiceActor: { name: string; image: string | null } | null;
};

export type CharacterDetails = {
  id: number;
  name: string;
  nativeName: string | null;
  alternativeNames: string[];
  image: string | null;
  description: string | null;
  gender: string | null;
  age: string | null;
  birthday: string | null;
  bloodType: string | null;
  favourites: number | null;
};

type RawMedia = {
  id: number;
  title: { romaji: string | null; english: string | null; native?: string | null };
  coverImage: { large: string | null; extraLarge?: string | null; color: string | null } | null;
  bannerImage?: string | null;
  type?: MediaType | null;
  countryOfOrigin?: string | null;
  episodes: number | null;
  chapters?: number | null;
  volumes?: number | null;
  startDate?: { year: number | null } | null;
  staff?: { edges: { role: string; node: { name: { full: string | null } } }[] } | null;
  nextAiringEpisode?: { episode: number; airingAt: number } | null;
  format: string | null;
  seasonYear: number | null;
  season?: string | null;
  averageScore: number | null;
  description?: string | null;
  genres?: string[] | null;
  status?: string | null;
  duration?: number | null;
  studios?: { nodes: { name: string }[] } | null;
  characters?: {
    edges: {
      role: CharacterSummary['role'];
      node: { id: number; name: { full: string | null }; image: { large: string | null } | null };
      voiceActors: { name: { full: string | null }; image: { medium: string | null } | null }[];
    }[];
  } | null;
};

const SUMMARY_FIELDS = `
  id
  title { romaji english }
  coverImage { extraLarge large color }
  bannerImage
  type
  countryOfOrigin
  episodes
  chapters
  startDate { year }
  status
  nextAiringEpisode { episode airingAt }
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

/** What has aired so far, derived from AniList's status and next-episode schedule. */
function airing(m: RawMedia) {
  const status = m.status ?? null;
  const next = m.nextAiringEpisode ?? null;
  let aired: number | null = null;
  if (status === 'NOT_YET_RELEASED') aired = 0;
  else if (next) aired = Math.max(0, next.episode - 1);
  else if (status === 'FINISHED' || status === 'CANCELLED') aired = total(m);
  return { airingStatus: status, airedEpisodes: aired, nextAiringAt: next ? next.airingAt * 1000 : null };
}

/** Episodes for anime, chapters for manga. */
function total(m: RawMedia) {
  return m.type === 'MANGA' ? (m.chapters ?? null) : m.episodes;
}

/** Fresh episode/chapter counts and release schedules for library titles, 50 per request. */
export async function getAiringInfo(ids: number[], signal?: AbortSignal) {
  const out: AnimeSummary[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const data = await request<{ Page: { media: RawMedia[] } }>(
      `query ($ids: [Int]) { Page(perPage: 50) { media(id_in: $ids) { ${SUMMARY_FIELDS} } } }`,
      { ids: ids.slice(i, i + 50) },
      signal
    );
    out.push(...data.Page.media.map(toSummary));
  }
  return out;
}

export type ScheduledEpisode = { animeId: number; title: string; episode: number; airingAt: number };

/** Every announced upcoming episode for the given shows (AniList publishes whole seasons ahead). */
export async function getAiringSchedules(ids: number[], signal?: AbortSignal) {
  const out: ScheduledEpisode[] = [];
  for (let i = 0; i < ids.length; i += 25) {
    const data = await request<{
      Page: {
        media: {
          id: number;
          title: RawMedia['title'];
          airingSchedule: { nodes: { episode: number; airingAt: number }[] };
        }[];
      };
    }>(
      `query ($ids: [Int]) {
        Page(perPage: 25) {
          media(id_in: $ids, type: ANIME) {
            id
            title { romaji english }
            airingSchedule(notYetAired: true, perPage: 25) { nodes { episode airingAt } }
          }
        }
      }`,
      { ids: ids.slice(i, i + 25) },
      signal
    );
    for (const m of data.Page.media) {
      const title = m.title.english || m.title.romaji || 'Untitled';
      for (const n of m.airingSchedule.nodes) {
        out.push({ animeId: m.id, title, episode: n.episode, airingAt: n.airingAt * 1000 });
      }
    }
  }
  return out;
}

function toSummary(m: RawMedia): AnimeSummary {
  return {
    id: m.id,
    type: m.type ?? 'ANIME',
    country: m.countryOfOrigin ?? null,
    title: m.title.english || m.title.romaji || 'Untitled',
    coverUrl: m.coverImage?.extraLarge ?? m.coverImage?.large ?? null,
    coverColor: m.coverImage?.color ?? null,
    bannerUrl: m.bannerImage ?? null,
    episodes: total(m),
    ...airing(m),
    format: m.format,
    year: m.seasonYear ?? m.startDate?.year ?? null,
    averageScore: m.averageScore,
  };
}

export type BrowseOptions = {
  kind?: MediaKind;
  search?: string;
  genre?: string;
  season?: Season;
  seasonYear?: number;
  sort?: 'SEARCH_MATCH' | 'TRENDING_DESC' | 'POPULARITY_DESC' | 'SCORE_DESC';
  perPage?: number;
};

export type Season = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';

/** AniList filters for each kind. Manga covers Japanese comics; manhwa is Korean. */
export const KIND_FILTER: Record<MediaKind, { type: MediaType; country: string | null }> = {
  anime: { type: 'ANIME', country: null },
  manga: { type: 'MANGA', country: 'JP' },
  manhwa: { type: 'MANGA', country: 'KR' },
};

/** Search or browse AniList: free-text search, genre, season and sort combine freely. */
export async function browseAnime(options: BrowseOptions, signal?: AbortSignal) {
  const { search, genre, season, seasonYear, perPage = 30, kind = 'anime' } = options;
  const sort = options.sort ?? (search ? 'SEARCH_MATCH' : 'POPULARITY_DESC');
  const { type, country } = KIND_FILTER[kind];
  // AniList treats `countryOfOrigin: null` as a filter that matches nothing, so the
  // argument is only included when a country is wanted.
  const countryArg = country ? ', countryOfOrigin: $country' : '';
  const countryVar = country ? ', $country: CountryCode' : '';
  const data = await request<{ Page: { media: RawMedia[] } }>(
    `query ($search: String, $genre: String, $season: MediaSeason, $seasonYear: Int, $sort: [MediaSort], $perPage: Int, $type: MediaType${countryVar}) {
      Page(perPage: $perPage) {
        media(search: $search, genre: $genre, season: $season, seasonYear: $seasonYear, sort: $sort, type: $type${countryArg}, isAdult: false) { ${SUMMARY_FIELDS} }
      }
    }`,
    { search, genre, season, seasonYear, sort: [sort], perPage, type, ...(country ? { country } : {}) },
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

const SEASONS: Season[] = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];

export function nextSeason(date = new Date()) {
  const { season, seasonYear } = currentSeason(date);
  const i = SEASONS.indexOf(season);
  return i === 3 ? { season: SEASONS[0], seasonYear: seasonYear + 1 } : { season: SEASONS[i + 1], seasonYear };
}

export function seasonLabel({ season, seasonYear }: { season: Season; seasonYear: number }) {
  return `${season[0]}${season.slice(1).toLowerCase()} ${seasonYear}`;
}

const ANIME_FEED = {
  trending: 'perPage: 10) { media(type: ANIME, isAdult: false, sort: [TRENDING_DESC])',
  airing: 'perPage: 15) { media(type: ANIME, isAdult: false, status: RELEASING, sort: [POPULARITY_DESC])',
  season: 'perPage: 15) { media(type: ANIME, isAdult: false, season: $season, seasonYear: $year, sort: [POPULARITY_DESC])',
  upcoming:
    'perPage: 15) { media(type: ANIME, isAdult: false, season: $nextSeason, seasonYear: $nextYear, sort: [POPULARITY_DESC])',
  movies: 'perPage: 15) { media(type: ANIME, isAdult: false, format: MOVIE, sort: [SCORE_DESC])',
  action: 'perPage: 15) { media(type: ANIME, isAdult: false, genre: "Action", sort: [TRENDING_DESC])',
  sliceOfLife: 'perPage: 15) { media(type: ANIME, isAdult: false, genre: "Slice of Life", sort: [POPULARITY_DESC])',
  romance: 'perPage: 15) { media(type: ANIME, isAdult: false, genre: "Romance", sort: [POPULARITY_DESC])',
  topRated: 'perPage: 15) { media(type: ANIME, isAdult: false, sort: [SCORE_DESC])',
  allTime: 'perPage: 15) { media(type: ANIME, isAdult: false, sort: [POPULARITY_DESC])',
};

const MANGA_FEED = {
  trending: 'perPage: 10) { media(type: MANGA, isAdult: false, sort: [TRENDING_DESC])',
  manhwa: 'perPage: 15) { media(type: MANGA, countryOfOrigin: KR, isAdult: false, sort: [TRENDING_DESC])',
  manga: 'perPage: 15) { media(type: MANGA, countryOfOrigin: JP, isAdult: false, sort: [TRENDING_DESC])',
  ongoing: 'perPage: 15) { media(type: MANGA, isAdult: false, status: RELEASING, sort: [POPULARITY_DESC])',
  actionManhwa:
    'perPage: 15) { media(type: MANGA, countryOfOrigin: KR, isAdult: false, genre: "Action", sort: [POPULARITY_DESC])',
  completed: 'perPage: 15) { media(type: MANGA, isAdult: false, status: FINISHED, sort: [TRENDING_DESC])',
  romanceManhwa:
    'perPage: 15) { media(type: MANGA, countryOfOrigin: KR, isAdult: false, genre: "Romance", sort: [POPULARITY_DESC])',
  fantasy: 'perPage: 15) { media(type: MANGA, isAdult: false, genre: "Fantasy", sort: [TRENDING_DESC])',
  manhua: 'perPage: 15) { media(type: MANGA, countryOfOrigin: CN, isAdult: false, sort: [POPULARITY_DESC])',
  topRated: 'perPage: 15) { media(type: MANGA, isAdult: false, sort: [SCORE_DESC])',
  allTime: 'perPage: 15) { media(type: MANGA, isAdult: false, sort: [POPULARITY_DESC])',
};

/** Home is anime; the Manga tab covers manga, manhwa and manhua. */
export type Medium = 'anime' | 'manga';

export type Feed = Record<string, AnimeSummary[]>;

/** Every discovery row on a home page in one request, to stay well inside AniList's rate limit. */
export async function getFeed(medium: Medium, signal?: AbortSignal): Promise<Feed> {
  const rowsDef: Record<string, string> = medium === 'anime' ? ANIME_FEED : MANGA_FEED;
  const now = currentSeason();
  const next = nextSeason();
  const rows = Object.entries(rowsDef)
    .map(([key, args]) => `${key}: Page(${args} { ...Summary } }`)
    .join('\n');
  const variables =
    medium === 'anime'
      ? { season: now.season, year: now.seasonYear, nextSeason: next.season, nextYear: next.seasonYear }
      : {};
  const params =
    medium === 'anime' ? '($season: MediaSeason, $year: Int, $nextSeason: MediaSeason, $nextYear: Int)' : '';
  const data = await request<Record<string, { media: RawMedia[] }>>(
    `fragment Summary on Media { ${SUMMARY_FIELDS} }
    query ${params} {
      ${rows}
    }`,
    variables,
    signal
  );
  return Object.fromEntries(Object.keys(rowsDef).map((key) => [key, (data[key]?.media ?? []).map(toSummary)]));
}

/** AniList's community recommendations for a show. */
export async function getRecommendations(id: number, signal?: AbortSignal) {
  const data = await request<{
    Media: { recommendations: { nodes: { mediaRecommendation: RawMedia | null }[] } };
  }>(
    `query ($id: Int) {
      Media(id: $id) {
        recommendations(sort: [RATING_DESC], perPage: 15) {
          nodes { mediaRecommendation { ${SUMMARY_FIELDS} } }
        }
      }
    }`,
    { id },
    signal
  );
  return data.Media.recommendations.nodes
    .map((n) => n.mediaRecommendation)
    .filter((m): m is RawMedia => m != null)
    .map(toSummary);
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
      Media(id: $id) {
        id
        title { romaji english native }
        coverImage { large extraLarge color }
        bannerImage
        type
        countryOfOrigin
        episodes
        chapters
        volumes
        startDate { year }
        staff(sort: [RELEVANCE, ID], perPage: 6) { edges { role node { name { full } } } }
        nextAiringEpisode { episode airingAt }
        format
        season
        seasonYear
        averageScore
        description(asHtml: false)
        genres
        status
        duration
        studios(isMain: true) { nodes { name } }
        characters(sort: [ROLE, RELEVANCE, ID], perPage: 16) {
          edges {
            role
            node { id name { full } image { large } }
            voiceActors(language: JAPANESE, sort: [RELEVANCE, ID]) { name { full } image { medium } }
          }
        }
      }
    }`,
    { id },
    signal
  );
  const m = data.Media;
  return {
    ...toSummary(m),
    nativeTitle: m.title.native ?? null,
    titles: [...new Set([m.title.english, m.title.romaji].filter((t): t is string => !!t))],
    bannerUrl: m.bannerImage ?? null,
    description: m.description ? cleanDescription(m.description) : null,
    genres: m.genres ?? [],
    status: m.status ?? null,
    season: m.season ?? null,
    studios: m.studios?.nodes.map((s) => s.name) ?? [],
    authors: [
      ...new Set(
        (m.staff?.edges ?? [])
          .filter((e) => /story|art|original/i.test(e.role))
          .map((e) => e.node.name.full)
          .filter((n): n is string => !!n)
      ),
    ].slice(0, 2),
    volumes: m.volumes ?? null,
    duration: m.duration ?? null,
    characters:
      m.characters?.edges.map((e) => ({
        id: e.node.id,
        name: e.node.name.full ?? 'Unknown',
        image: e.node.image?.large ?? null,
        role: e.role,
        voiceActor: e.voiceActors[0]
          ? { name: e.voiceActors[0].name.full ?? '', image: e.voiceActors[0].image?.medium ?? null }
          : null,
      })) ?? [],
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function getCharacter(id: number, signal?: AbortSignal): Promise<CharacterDetails> {
  const data = await request<{
    Character: {
      id: number;
      name: { full: string | null; native: string | null; alternative: string[] | null };
      image: { large: string | null } | null;
      description: string | null;
      gender: string | null;
      age: string | null;
      dateOfBirth: { year: number | null; month: number | null; day: number | null } | null;
      bloodType: string | null;
      favourites: number | null;
    };
  }>(
    `query ($id: Int) {
      Character(id: $id) {
        id
        name { full native alternative }
        image { large }
        description(asHtml: false)
        gender
        age
        dateOfBirth { year month day }
        bloodType
        favourites
      }
    }`,
    { id },
    signal
  );
  const c = data.Character;
  const dob = c.dateOfBirth;
  const birthday =
    dob?.month && dob.day
      ? `${MONTHS[dob.month - 1]} ${dob.day}${dob.year ? `, ${dob.year}` : ''}`
      : null;
  return {
    id: c.id,
    name: c.name.full ?? 'Unknown',
    nativeName: c.name.native,
    alternativeNames: (c.name.alternative ?? []).filter(Boolean),
    image: c.image?.large ?? null,
    description: c.description ? cleanCharacterDescription(c.description) : null,
    gender: c.gender,
    age: c.age,
    birthday,
    bloodType: c.bloodType,
    favourites: c.favourites,
  };
}

/** AniList character bios use Markdown, links and ~!spoiler!~ blocks. */
function cleanCharacterDescription(text: string) {
  return cleanDescription(
    text
      .replace(/~!([\s\S]*?)!~/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/(^|\s)_([^_]+)_(?=\s|[.,!?]|$)/g, '$1$2')
      .replace(/^\s*[-*]\s+/gm, '• ')
  );
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
    MANGA: 'Manga',
    NOVEL: 'Light Novel',
    ONE_SHOT: 'One-shot',
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

export function isManga(a: Pick<AnimeSummary, 'type'>) {
  return a.type === 'MANGA';
}

/** The kind a title belongs to, for library tabs and labels. */
export function kindOf(a: Pick<AnimeSummary, 'type' | 'country'>): MediaKind {
  if (a.type !== 'MANGA') return 'anime';
  return a.country === 'KR' ? 'manhwa' : 'manga';
}

/** "Manhwa", "Manhua", "Light Novel", "TV"… */
export function mediaLabel(a: Pick<AnimeSummary, 'type' | 'country' | 'format'>) {
  if (a.type !== 'MANGA') return formatLabel(a.format);
  if (a.format === 'NOVEL' || a.format === 'ONE_SHOT') return formatLabel(a.format);
  return a.country === 'KR' ? 'Manhwa' : a.country === 'CN' || a.country === 'TW' ? 'Manhua' : 'Manga';
}

/** Words for progress: episodes for anime, chapters for manga. */
export function unitsOf(a: Pick<AnimeSummary, 'type'>) {
  return isManga(a)
    ? { one: 'Chapter', many: 'chapters', short: 'Ch', verb: 'Reading', done: 'Read', start: 'Start Reading' }
    : { one: 'Episode', many: 'episodes', short: 'Ep', verb: 'Watching', done: 'Watched', start: 'Start Watching' };
}

/** Strips detail-only fields so only the summary is persisted in the library. */
export function pickSummary(a: AnimeSummary): AnimeSummary {
  const { id, title, coverUrl, coverColor, bannerUrl, episodes, format, year, averageScore } = a;
  return {
    id,
    type: a.type ?? 'ANIME',
    country: a.country ?? null,
    title,
    coverUrl,
    coverColor,
    bannerUrl: bannerUrl ?? null,
    episodes,
    airingStatus: a.airingStatus ?? null,
    airedEpisodes: a.airedEpisodes ?? null,
    nextAiringAt: a.nextAiringAt ?? null,
    format,
    year,
    averageScore,
  };
}
