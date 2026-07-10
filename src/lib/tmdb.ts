const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

export type PosterMediaType = "movie" | "tv" | "anime";

type TmdbSearchResult = {
  poster_path: string | null;
  media_type?: string;
};

async function tmdbGet(path: string, params: Record<string, string>, revalidateSeconds = 60 * 60 * 24) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;

  const qs = new URLSearchParams({
    api_key: apiKey,
    language: "ko-KR",
    include_adult: "false",
    ...params,
  });

  const res = await fetch(`${TMDB_BASE}${path}?${qs.toString()}`, {
    next: { revalidate: revalidateSeconds },
  });
  if (!res.ok) return null;
  return res.json();
}

export function isTmdbConfigured(): boolean {
  return Boolean(process.env.TMDB_API_KEY);
}

/**
 * Resolves an official poster image URL for a title by searching TMDB.
 * "anime" is searched as "tv" since TMDB doesn't have a separate anime type.
 * Falls back to a year-less retry, then a multi-search, before giving up.
 */
export async function searchPoster({
  title,
  mediaType,
  year,
}: {
  title: string;
  mediaType?: PosterMediaType;
  year?: number;
}): Promise<string | null> {
  const type = mediaType === "movie" ? "movie" : "tv";
  const yearKey = type === "movie" ? "year" : "first_air_date_year";

  let result: TmdbSearchResult | undefined;

  if (year) {
    const data = await tmdbGet(`/search/${type}`, { query: title, [yearKey]: String(year) });
    result = data?.results?.[0];
  }

  if (!result) {
    const data = await tmdbGet(`/search/${type}`, { query: title });
    result = data?.results?.[0];
  }

  if (!result) {
    const data = await tmdbGet("/search/multi", { query: title });
    result = data?.results?.find((r: TmdbSearchResult) => r.media_type === "movie" || r.media_type === "tv");
  }

  // Season/cour suffixes (e.g. "무직전생 3기", "OO 시즌2") often aren't part of
  // the base show's TMDB title — retry once with the suffix stripped.
  if (!result) {
    const stripped = title.replace(/\s*(시즌\s*\d+|파트\s*\d+|\d+\s*기)\s*$/u, "").trim();
    if (stripped && stripped !== title) {
      const data = await tmdbGet("/search/multi", { query: stripped });
      result = data?.results?.find((r: TmdbSearchResult) => r.media_type === "movie" || r.media_type === "tv");
    }
  }

  if (!result?.poster_path) return null;
  return `${TMDB_IMAGE_BASE}${result.poster_path}`;
}

export type PosterAndWatch = {
  posterUrl: string | null;
  ottName: string | null;
  watchUrl: string | null;
};

/**
 * Same title-resolution cascade as searchPoster, but also verifies real KR
 * streaming availability via TMDB watch/providers and resolves a click-through
 * link (see resolveWatchInfo below) — used for the AI course list, whose
 * `ott` field is only Gemini's guess and never had a link at all.
 */
export async function resolvePosterAndWatch({
  title,
  mediaType,
  year,
}: {
  title: string;
  mediaType?: PosterMediaType;
  year?: number;
}): Promise<PosterAndWatch> {
  const type = mediaType === "movie" ? "movie" : "tv";
  const yearKey = type === "movie" ? "year" : "first_air_date_year";

  let result: TmdbMultiSearchResult | undefined;
  let resolvedType: "movie" | "tv" = type;

  if (year) {
    const data = await tmdbGet(`/search/${type}`, { query: title, [yearKey]: String(year) });
    result = data?.results?.[0];
  }

  if (!result) {
    const data = await tmdbGet(`/search/${type}`, { query: title });
    result = data?.results?.[0];
  }

  if (!result) {
    const data = await tmdbGet("/search/multi", { query: title });
    result = data?.results?.find(
      (r: TmdbMultiSearchResult) => r.media_type === "movie" || r.media_type === "tv"
    );
    if (result?.media_type === "movie" || result?.media_type === "tv") resolvedType = result.media_type;
  }

  if (!result) {
    // Season/cour suffixes often aren't part of the base show's TMDB title — same retry as searchPoster.
    const stripped = title.replace(/\s*(시즌\s*\d+|파트\s*\d+|\d+\s*기)\s*$/u, "").trim();
    if (stripped && stripped !== title) {
      const data = await tmdbGet("/search/multi", { query: stripped });
      result = data?.results?.find(
        (r: TmdbMultiSearchResult) => r.media_type === "movie" || r.media_type === "tv"
      );
      if (result?.media_type === "movie" || result?.media_type === "tv") resolvedType = result.media_type;
    }
  }

  if (!result) return { posterUrl: null, ottName: null, watchUrl: null };

  const posterUrl = result.poster_path ? `${TMDB_IMAGE_BASE}${result.poster_path}` : null;
  if (!result.id) return { posterUrl, ottName: null, watchUrl: null };

  const providers = (await tmdbGet(`/${resolvedType}/${result.id}/watch/providers`, {})) as TmdbWatchProvidersResponse | null;
  const { ottName, watchUrl } = resolveWatchInfo(providers, title);

  return { posterUrl, ottName, watchUrl };
}

export type TitleSuggestion = {
  id: number;
  title: string;
  year?: number;
  mediaType: "movie" | "tv";
  posterUrl: string | null;
};

type TmdbMultiSearchResult = {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
};

/** Autocomplete suggestions for the "메인디쉬" title search — real OTT titles via TMDB multi-search. */
export async function searchTitles(query: string): Promise<TitleSuggestion[]> {
  if (!query.trim()) return [];

  const data = await tmdbGet("/search/multi", { query });
  const results = (data?.results ?? []) as TmdbMultiSearchResult[];

  return results
    .filter((r) => r.media_type === "movie" || r.media_type === "tv")
    .slice(0, 8)
    .map((r) => {
      const dateStr = r.release_date ?? r.first_air_date;
      return {
        id: r.id,
        title: r.title ?? r.name ?? "",
        year: dateStr && dateStr.length >= 4 ? Number(dateStr.slice(0, 4)) : undefined,
        mediaType: r.media_type === "movie" ? "movie" : "tv",
        posterUrl: r.poster_path ? `${TMDB_IMAGE_BASE}${r.poster_path}` : null,
      } satisfies TitleSuggestion;
    })
    .filter((t) => t.title);
}

export type TitleDetails = {
  director: string | null;
  cast: string[];
  ottName: string | null;
  watchUrl: string | null;
};

// Maps TMDB's (usually English) watch-provider names to this app's Korean OTT
// display names. Keyed lowercase and looked up lowercase — TMDB's own provider
// data is inconsistently cased (e.g. "wavve" vs "Watcha"), so exact-case
// matching silently drops known providers.
const OTT_NAME_MAP: Record<string, string> = {
  netflix: "넷플릭스",
  "disney plus": "디즈니+",
  "coupang play": "쿠팡플레이",
  "apple tv": "Apple TV",
  "apple tv plus": "Apple TV",
  "apple tv+": "Apple TV",
  tving: "티빙",
  watcha: "왓챠",
  wavve: "웨이브",
  laftel: "라프텔",
  "amazon prime video": "프라임비디오",
  "prime video": "프라임비디오",
};

// TMDB's own `watch/providers.link` only points back to a themoviedb.org
// aggregation page (required JustWatch attribution), never to the actual OTT —
// so we send the user straight to the provider's own site instead. Where the
// provider's search URL format is confirmed, land directly on search results;
// otherwise fall back to the provider's homepage (still correct, unlike TMDB).
// Same lowercase-keyed lookup as OTT_NAME_MAP, for the same reason.
const OTT_LINK_MAP: Record<string, { home: string; search?: (title: string) => string }> = {
  netflix: { home: "https://www.netflix.com", search: (t) => `https://www.netflix.com/search?q=${encodeURIComponent(t)}` },
  "disney plus": { home: "https://www.disneyplus.com", search: (t) => `https://www.disneyplus.com/search/${encodeURIComponent(t)}` },
  "coupang play": {
    home: "https://www.coupangplay.com",
    search: (t) => `https://www.coupangplay.com/query?src=page_search&keyword=${encodeURIComponent(t)}`,
  },
  "apple tv": { home: "https://tv.apple.com", search: (t) => `https://tv.apple.com/kr/search?term=${encodeURIComponent(t)}` },
  "apple tv plus": { home: "https://tv.apple.com", search: (t) => `https://tv.apple.com/kr/search?term=${encodeURIComponent(t)}` },
  "apple tv+": { home: "https://tv.apple.com", search: (t) => `https://tv.apple.com/kr/search?term=${encodeURIComponent(t)}` },
  tving: { home: "https://www.tving.com", search: (t) => `https://www.tving.com/search?keyword=${encodeURIComponent(t)}` },
  watcha: { home: "https://watcha.com", search: (t) => `https://watcha.com/ko/search?query=${encodeURIComponent(t)}&domain=all` },
  wavve: { home: "https://www.wavve.com", search: (t) => `https://www.wavve.com/search?searchWord=${encodeURIComponent(t)}` },
  laftel: { home: "https://laftel.net", search: (t) => `https://laftel.net/search?keyword=${encodeURIComponent(t)}` },
  "amazon prime video": {
    home: "https://www.primevideo.com",
    search: (t) => `https://www.primevideo.com/-/ko/search?ie=UTF8&phrase=${encodeURIComponent(t)}`,
  },
  "prime video": {
    home: "https://www.primevideo.com",
    search: (t) => `https://www.primevideo.com/-/ko/search?ie=UTF8&phrase=${encodeURIComponent(t)}`,
  },
};

type TmdbCreditsResponse = {
  cast?: Array<{ name?: string }>;
  crew?: Array<{ name?: string; job?: string }>;
};

type TmdbWatchProvidersResponse = {
  results?: Record<string, { flatrate?: Array<{ provider_name?: string }>; link?: string }>;
};

/**
 * Shared by `getTitleDetails` and the trending carousel: picks the first KR
 * flatrate provider and resolves it to a display name + a link that actually
 * lands on that provider's own site (see OTT_LINK_MAP above), falling back to
 * TMDB's aggregation link only when the provider isn't in our map.
 */
function resolveWatchInfo(
  providers: TmdbWatchProvidersResponse | null,
  title: string
): { ottName: string | null; watchUrl: string | null } {
  const providerName = providers?.results?.KR?.flatrate?.[0]?.provider_name;
  const providerKey = providerName?.toLowerCase() ?? null;
  const ottName = providerKey ? (OTT_NAME_MAP[providerKey] ?? providerName ?? null) : null;
  const linkInfo = providerKey ? OTT_LINK_MAP[providerKey] : undefined;
  const watchUrl = linkInfo ? (linkInfo.search ? linkInfo.search(title) : linkInfo.home) : (providers?.results?.KR?.link ?? null);
  return { ottName, watchUrl };
}

/**
 * Director, top cast, KR streaming provider, and a "watch now" link for the
 * menu-board detail card. `watchUrl` points at the provider's own site
 * (search results where the URL format is confirmed, otherwise its homepage)
 * rather than TMDB's `watch/providers.link`, which only lands on a
 * themoviedb.org aggregation page (JustWatch attribution requirement), never
 * on the actual OTT.
 */
export async function getTitleDetails({
  id,
  mediaType,
  title,
}: {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
}): Promise<TitleDetails> {
  const [credits, providers] = await Promise.all([
    tmdbGet(`/${mediaType}/${id}/credits`, {}) as Promise<TmdbCreditsResponse | null>,
    tmdbGet(`/${mediaType}/${id}/watch/providers`, {}) as Promise<TmdbWatchProvidersResponse | null>,
  ]);

  const director = credits?.crew?.find((member) => member.job === "Director")?.name ?? null;
  const cast = (credits?.cast ?? [])
    .slice(0, 3)
    .map((member) => member.name)
    .filter((name): name is string => Boolean(name));

  const { ottName, watchUrl } = resolveWatchInfo(providers, title);

  return { director, cast, ottName, watchUrl };
}

export type TrendingTitle = {
  id: number;
  title: string;
  year?: number;
  mediaType: "movie" | "tv";
  posterUrl: string;
  ott: string;
  watchUrl: string;
};

type TmdbTrendingResult = {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
};

/**
 * Live "지금 뜨는" carousel data — TMDB's daily trending list (refreshed
 * hourly here, since trending itself only moves day-to-day) filtered down to
 * titles that actually stream on a recognized KR OTT, so every card's badge
 * and click-through link point somewhere real.
 */
export async function getTrendingWithWatchLinks(limit = 15): Promise<TrendingTitle[]> {
  // Most trending titles aren't actually streaming in Korea yet, so a single
  // 20-result page rarely survives the KR-availability filter below with
  // enough left for a full carousel — pull a few pages of the pool up front.
  const pages = await Promise.all(
    [1, 2, 3].map((page) => tmdbGet("/trending/all/day", { page: String(page) }, 60 * 60))
  );
  const candidates = pages
    .flatMap((data) => (data?.results ?? []) as TmdbTrendingResult[])
    .filter((r) => (r.media_type === "movie" || r.media_type === "tv") && r.poster_path);

  const resolved = await Promise.all(
    candidates.map(async (r): Promise<TrendingTitle | null> => {
      const mediaType = r.media_type === "movie" ? "movie" : "tv";
      const title = r.title ?? r.name ?? "";
      const providers = (await tmdbGet(`/${mediaType}/${r.id}/watch/providers`, {})) as TmdbWatchProvidersResponse | null;
      const { ottName, watchUrl } = resolveWatchInfo(providers, title);
      const dateStr = r.release_date ?? r.first_air_date;
      const year = dateStr && dateStr.length >= 4 ? Number(dateStr.slice(0, 4)) : undefined;

      if (!title || !ottName || !watchUrl || !r.poster_path) return null;
      return {
        id: r.id,
        title,
        year,
        mediaType,
        posterUrl: `${TMDB_IMAGE_BASE}${r.poster_path}`,
        ott: ottName,
        watchUrl,
      };
    })
  );

  // TMDB ids are only unique within a media type — a movie and a tv show can
  // share the same numeric id — so dedupe on the (id, mediaType) pair rather
  // than id alone, otherwise both survive and collide as React list keys.
  const seen = new Set<string>();
  const deduped = resolved.filter((item): item is TrendingTitle => {
    if (!item) return false;
    const key = `${item.mediaType}-${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.slice(0, limit);
}

// "꿀맛 랭킹" platform tabs — only platforms TMDB actually tracks as a KR watch
// provider are listed here (confirmed via /watch/providers/{movie,tv}). 라프텔
// and 씨네폭스 have no TMDB coverage, so they're deliberately absent; the
// route/UI show a "not yet supported" state for those slugs instead of
// silently returning nothing.
export type RankingPlatformSlug =
  | "netflix"
  | "disney-plus"
  | "coupang-play"
  | "apple-tv"
  | "tving"
  | "watcha"
  | "wavve"
  | "prime-video";

const RANKING_PLATFORM_TMDB: Record<RankingPlatformSlug, { providerId: number; tmdbKey: string }> = {
  netflix: { providerId: 8, tmdbKey: "netflix" },
  "disney-plus": { providerId: 337, tmdbKey: "disney plus" },
  "coupang-play": { providerId: 1881, tmdbKey: "coupang play" },
  "apple-tv": { providerId: 350, tmdbKey: "apple tv" },
  tving: { providerId: 1883, tmdbKey: "tving" },
  watcha: { providerId: 97, tmdbKey: "watcha" },
  wavve: { providerId: 356, tmdbKey: "wavve" },
  "prime-video": { providerId: 119, tmdbKey: "prime video" },
};

export function isRankingPlatformSupported(slug: string): slug is RankingPlatformSlug {
  return slug in RANKING_PLATFORM_TMDB;
}

export type RankingTitle = {
  rank: number;
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  year?: number;
  posterUrl: string;
  popularity: number;
  ott: string;
  watchUrl: string;
};

type RawRankingItem = Omit<RankingTitle, "rank">;

type TmdbDiscoverResult = {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  popularity?: number;
};

/**
 * A platform's currently-popular titles straight from TMDB's discover
 * endpoint, filtered to that provider's KR catalog and pre-sorted by
 * popularity. Unlike the trending carousel above, this needs no per-title
 * watch/providers lookup — the provider filter already guarantees
 * availability, so one request per media type is the whole cost.
 */
async function discoverByProvider(
  providerId: number,
  mediaType: "movie" | "tv",
  tmdbKey: string
): Promise<RawRankingItem[]> {
  const data = await tmdbGet(
    `/discover/${mediaType}`,
    { watch_region: "KR", with_watch_providers: String(providerId), sort_by: "popularity.desc" },
    60 * 30 // 30 min — fresh enough for a "live" ranking without hammering the free tier
  );
  const results = (data?.results ?? []) as TmdbDiscoverResult[];
  const linkInfo = OTT_LINK_MAP[tmdbKey];
  const ottName = OTT_NAME_MAP[tmdbKey] ?? tmdbKey;

  return results
    .filter((r) => r.poster_path)
    .map((r): RawRankingItem => {
      const title = r.title ?? r.name ?? "";
      const dateStr = r.release_date ?? r.first_air_date;
      const year = dateStr && dateStr.length >= 4 ? Number(dateStr.slice(0, 4)) : undefined;
      return {
        id: r.id,
        mediaType,
        title,
        year,
        posterUrl: `${TMDB_IMAGE_BASE}${r.poster_path}`,
        popularity: r.popularity ?? 0,
        ott: ottName,
        watchUrl: linkInfo ? (linkInfo.search ? linkInfo.search(title) : linkInfo.home) : "",
      };
    })
    .filter((item) => item.title);
}

function dedupeAndRank(items: RawRankingItem[], limit: number): RankingTitle[] {
  const seen = new Set<string>();
  const deduped: RawRankingItem[] = [];
  for (const item of [...items].sort((a, b) => b.popularity - a.popularity)) {
    const key = `${item.mediaType}-${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped.slice(0, limit).map((item, i) => ({ ...item, rank: i + 1 }));
}

/** One platform's live popularity ranking (movies + TV merged into a single list). */
export async function getPlatformRanking(slug: RankingPlatformSlug, limit = 20): Promise<RankingTitle[]> {
  const { providerId, tmdbKey } = RANKING_PLATFORM_TMDB[slug];
  const [movies, shows] = await Promise.all([
    discoverByProvider(providerId, "movie", tmdbKey),
    discoverByProvider(providerId, "tv", tmdbKey),
  ]);
  return dedupeAndRank([...movies, ...shows], limit);
}

/**
 * "통합 랭킹" — re-ranks the union of every supported platform's pool by
 * popularity. Reuses the same cached discover calls each platform tab makes
 * (Next's fetch cache dedupes by URL), so this costs nothing extra once the
 * individual platform tabs have been hit once in the current cache window.
 */
export async function getCombinedRanking(limit = 20): Promise<RankingTitle[]> {
  const slugs = Object.keys(RANKING_PLATFORM_TMDB) as RankingPlatformSlug[];
  const perPlatform = await Promise.all(slugs.map((slug) => getPlatformRanking(slug, 40)));
  return dedupeAndRank(perPlatform.flat(), limit);
}

// ---- Home carousel: balanced across platform AND format ----

export type HomeCarouselCategory = "movie" | "drama" | "anime" | "variety";

export type HomeCarouselTitle = {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  year?: number;
  posterUrl: string;
  ott: string;
  watchUrl: string;
  category: HomeCarouselCategory;
  popularity: number;
};

// TMDB genre ids (shared across /movie and /tv discover responses).
const ANIME_GENRE_ID = 16; // "Animation" — TMDB has no separate live-action/anime split
const VARIETY_GENRE_IDS = new Set([10764, 10767]); // Reality, Talk — closest match to "예능"

function classifyCarouselCategory(mediaType: "movie" | "tv", genreIds: number[]): HomeCarouselCategory {
  if (genreIds.includes(ANIME_GENRE_ID)) return "anime";
  if (mediaType === "movie") return "movie";
  if (genreIds.some((id) => VARIETY_GENRE_IDS.has(id))) return "variety";
  return "drama";
}

type TmdbDiscoverResultWithGenre = TmdbDiscoverResult & { genre_ids?: number[] };

/**
 * Same discover-by-provider approach as `discoverByProvider` above (one
 * request per media type, no per-title watch/providers lookup needed), but
 * also keeps `genre_ids` so results can be bucketed into the four home-feed
 * categories below.
 */
async function discoverForCarousel(
  providerId: number,
  mediaType: "movie" | "tv",
  tmdbKey: string
): Promise<HomeCarouselTitle[]> {
  const data = await tmdbGet(
    `/discover/${mediaType}`,
    { watch_region: "KR", with_watch_providers: String(providerId), sort_by: "popularity.desc" },
    60 * 60
  );
  const results = (data?.results ?? []) as TmdbDiscoverResultWithGenre[];
  const linkInfo = OTT_LINK_MAP[tmdbKey];
  const ottName = OTT_NAME_MAP[tmdbKey] ?? tmdbKey;

  return results
    .filter((r) => r.poster_path)
    .map((r): HomeCarouselTitle => {
      const title = r.title ?? r.name ?? "";
      const dateStr = r.release_date ?? r.first_air_date;
      const year = dateStr && dateStr.length >= 4 ? Number(dateStr.slice(0, 4)) : undefined;
      return {
        id: r.id,
        mediaType,
        title,
        year,
        posterUrl: `${TMDB_IMAGE_BASE}${r.poster_path}`,
        ott: ottName,
        watchUrl: linkInfo ? (linkInfo.search ? linkInfo.search(title) : linkInfo.home) : "",
        category: classifyCarouselCategory(mediaType, r.genre_ids ?? []),
        popularity: r.popularity ?? 0,
      };
    })
    .filter((item) => item.title);
}

const CAROUSEL_CATEGORIES: HomeCarouselCategory[] = ["movie", "drama", "anime", "variety"];

/**
 * The home carousel used to just take TMDB's raw daily trending list, which
 * skews heavily toward whatever single format/platform happens to be
 * globally trending that day (in practice, mostly anime) — not a great look
 * for a service whose whole pitch is "every platform, every format, evenly".
 *
 * This instead pools currently-popular titles from every supported platform
 * (same 8 as the 꿀맛 랭킹 tabs), tags each with a format category, and picks
 * an even split per category (movie/drama/anime/variety). Within each
 * category, platforms already picked from earlier categories are
 * deprioritized (not excluded — falls back to them if a category has fewer
 * than 4 distinct platforms available) so the full set also spreads across
 * platforms rather than clustering on whichever one dominates a category.
 */
export async function getBalancedHomeCarousel(limit = 16): Promise<HomeCarouselTitle[]> {
  const slugs = Object.keys(RANKING_PLATFORM_TMDB) as RankingPlatformSlug[];
  const perPlatform = await Promise.all(
    slugs.map(async (slug) => {
      const { providerId, tmdbKey } = RANKING_PLATFORM_TMDB[slug];
      const [movies, shows] = await Promise.all([
        discoverForCarousel(providerId, "movie", tmdbKey),
        discoverForCarousel(providerId, "tv", tmdbKey),
      ]);
      return [...movies, ...shows];
    })
  );

  const seen = new Set<string>();
  const pool = perPlatform.flat().filter((item) => {
    const key = `${item.mediaType}-${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const perCategory = Math.max(1, Math.floor(limit / CAROUSEL_CATEGORIES.length));
  const platformCounts = new Map<string, number>();
  const byCategory = new Map<HomeCarouselCategory, HomeCarouselTitle[]>();

  for (const category of CAROUSEL_CATEGORIES) {
    const candidates = pool
      .filter((item) => item.category === category)
      .sort((a, b) => {
        const usageDiff = (platformCounts.get(a.ott) ?? 0) - (platformCounts.get(b.ott) ?? 0);
        return usageDiff !== 0 ? usageDiff : b.popularity - a.popularity;
      });

    const chosen: HomeCarouselTitle[] = [];
    const usedPlatforms = new Set<string>();
    for (const item of candidates) {
      if (chosen.length >= perCategory) break;
      if (usedPlatforms.has(item.ott)) continue;
      chosen.push(item);
      usedPlatforms.add(item.ott);
    }
    // Category has fewer distinct platforms than the quota — fill the rest
    // regardless of platform repeats rather than leaving the slot empty.
    for (const item of candidates) {
      if (chosen.length >= perCategory) break;
      if (chosen.includes(item)) continue;
      chosen.push(item);
    }

    for (const item of chosen) platformCounts.set(item.ott, (platformCounts.get(item.ott) ?? 0) + 1);
    byCategory.set(category, chosen);
  }

  // Interleave (movie[0], drama[0], anime[0], variety[0], movie[1], ...)
  // instead of returning four same-category blocks back to back — the ratio
  // is already even either way, but this keeps the actual swipe-through feed
  // from feeling like four separate reels glued together.
  const picked: HomeCarouselTitle[] = [];
  for (let i = 0; i < perCategory; i++) {
    for (const category of CAROUSEL_CATEGORIES) {
      const item = byCategory.get(category)?.[i];
      if (item) picked.push(item);
    }
  }

  return picked.slice(0, limit);
}

// ---- Search results page: main title + tiered "related" recommendations ----

export type SearchMainTitle = TitleSuggestion & {
  director: string | null;
  cast: string[];
  ottName: string | null;
  watchUrl: string | null;
};

export type RelatedTitle = TitleSuggestion & { ott: string; watchUrl: string };

export type RelatedGroup = {
  label: string;
  items: RelatedTitle[];
};

export type SearchPageData = {
  main: SearchMainTitle;
  groups: RelatedGroup[];
};

type TmdbCrewMember = { id?: number; name?: string; job?: string };
type TmdbMovieDetails = {
  id: number;
  title?: string;
  release_date?: string;
  poster_path?: string | null;
  belongs_to_collection?: { id: number } | null;
  credits?: { cast?: Array<{ name?: string }>; crew?: TmdbCrewMember[] };
};
type TmdbCollectionResponse = {
  parts?: Array<{ id: number; title?: string; release_date?: string; poster_path?: string | null }>;
};
type TmdbPersonMovieCredits = {
  crew?: Array<{ id: number; title?: string; release_date?: string; poster_path?: string | null; job?: string }>;
};
type TmdbTvDetails = {
  id: number;
  name?: string;
  first_air_date?: string;
  poster_path?: string | null;
  created_by?: Array<{ id: number; name?: string }>;
};
type TmdbPersonTvCredits = {
  crew?: Array<{ id: number; name?: string; first_air_date?: string; poster_path?: string | null }>;
};
type TmdbRecommendationsResponse = {
  results?: Array<{ id: number; title?: string; name?: string; release_date?: string; first_air_date?: string; poster_path?: string | null }>;
};

function toTitleSuggestion(
  r: { id: number; title?: string; name?: string; release_date?: string; first_air_date?: string; poster_path?: string | null },
  mediaType: "movie" | "tv"
): TitleSuggestion | null {
  const title = r.title ?? r.name ?? "";
  if (!title || !r.poster_path) return null;
  const dateStr = r.release_date ?? r.first_air_date;
  return {
    id: r.id,
    title,
    year: dateStr && dateStr.length >= 4 ? Number(dateStr.slice(0, 4)) : undefined,
    mediaType,
    posterUrl: `${TMDB_IMAGE_BASE}${r.poster_path}`,
  };
}

/**
 * Related-title posters need to be clickable straight through to wherever
 * they actually stream (same as the main title's "시청하기"), not just to
 * another internal search page — so each candidate gets its own
 * watch/providers lookup, and anything with no resolvable KR provider is
 * dropped rather than shown as a dead click.
 */
async function resolveOttForItems(items: TitleSuggestion[], mediaType: "movie" | "tv"): Promise<RelatedTitle[]> {
  const resolved = await Promise.all(
    items.map(async (item): Promise<RelatedTitle | null> => {
      const providers = (await tmdbGet(`/${mediaType}/${item.id}/watch/providers`, {})) as TmdbWatchProvidersResponse | null;
      const { ottName, watchUrl } = resolveWatchInfo(providers, item.title);
      if (!ottName || !watchUrl) return null;
      return { ...item, ott: ottName, watchUrl };
    })
  );
  return resolved.filter((item): item is RelatedTitle => item !== null);
}

/**
 * Search-results page data: the searched title up top, then "related" titles
 * grouped into three priority tiers —
 *   1. 시리즈 (same franchise: TMDB's `belongs_to_collection` for movies, a
 *      stripped-title-stem search for TV/anime since TMDB has no collection
 *      concept there)
 *   2. 감독/제작자의 다른 작품 (same director for movies, same creator for TV) —
 *      note TMDB has no "shared universe" tagging (e.g. MCU spans many
 *      separate collections), so that specific criterion from the spec isn't
 *      achievable without a hand-curated mapping; this tier covers the
 *      same-director/creator half of that priority level
 *   3. 비슷한 장르의 작품 — TMDB's own `/recommendations` endpoint
 * Each tier excludes anything already shown in an earlier tier.
 */
export async function getSearchPageData({
  id,
  mediaType,
  title,
}: {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
}): Promise<SearchPageData | null> {
  const seen = new Set<number>([id]);
  const groups: RelatedGroup[] = [];

  if (mediaType === "movie") {
    const details = (await tmdbGet(`/movie/${id}`, { append_to_response: "credits" })) as TmdbMovieDetails | null;
    if (!details) return null;

    const mainTitle = details.title ?? title;
    const year = details.release_date && details.release_date.length >= 4 ? Number(details.release_date.slice(0, 4)) : undefined;
    const posterUrl = details.poster_path ? `${TMDB_IMAGE_BASE}${details.poster_path}` : null;
    const director = details.credits?.crew?.find((c) => c.job === "Director") ?? null;
    const cast = (details.credits?.cast ?? [])
      .slice(0, 3)
      .map((c) => c.name)
      .filter((n): n is string => Boolean(n));

    const providers = (await tmdbGet(`/movie/${id}/watch/providers`, {})) as TmdbWatchProvidersResponse | null;
    const { ottName, watchUrl } = resolveWatchInfo(providers, mainTitle);

    // Tier 1: same collection (Harry Potter → the rest of the Harry Potter Collection)
    if (details.belongs_to_collection?.id) {
      const collection = (await tmdbGet(`/collection/${details.belongs_to_collection.id}`, {})) as TmdbCollectionResponse | null;
      const parts = (collection?.parts ?? [])
        .filter((p) => !seen.has(p.id))
        .sort((a, b) => (a.release_date ?? "").localeCompare(b.release_date ?? ""))
        .map((p) => toTitleSuggestion(p, "movie"))
        .filter((p): p is TitleSuggestion => p !== null);
      parts.forEach((p) => seen.add(p.id));
      const resolvedParts = await resolveOttForItems(parts.slice(0, 10), "movie");
      if (resolvedParts.length > 0) groups.push({ label: "시리즈", items: resolvedParts });
    }

    // Tier 2: same director's other films
    if (director?.id) {
      const personCredits = (await tmdbGet(`/person/${director.id}/movie_credits`, {})) as TmdbPersonMovieCredits | null;
      const directed = (personCredits?.crew ?? [])
        .filter((c) => c.job === "Director" && !seen.has(c.id))
        .sort((a, b) => (b.release_date ?? "").localeCompare(a.release_date ?? ""))
        .map((c) => toTitleSuggestion(c, "movie"))
        .filter((c): c is TitleSuggestion => c !== null);
      directed.forEach((c) => seen.add(c.id));
      const resolvedDirected = await resolveOttForItems(directed.slice(0, 10), "movie");
      if (resolvedDirected.length > 0) groups.push({ label: `${director.name ?? "같은"} 감독의 다른 작품`, items: resolvedDirected });
    }

    // Tier 3: TMDB's own similarity engine (genre/keyword/cast-based)
    const recs = (await tmdbGet(`/movie/${id}/recommendations`, {})) as TmdbRecommendationsResponse | null;
    const similar = (recs?.results ?? [])
      .filter((r) => !seen.has(r.id))
      .map((r) => toTitleSuggestion(r, "movie"))
      .filter((r): r is TitleSuggestion => r !== null);
    const resolvedSimilar = await resolveOttForItems(similar.slice(0, 10), "movie");
    if (resolvedSimilar.length > 0) groups.push({ label: "비슷한 장르의 작품", items: resolvedSimilar });

    return {
      main: { id, title: mainTitle, year, mediaType: "movie", posterUrl, director: director?.name ?? null, cast, ottName, watchUrl },
      groups,
    };
  }

  // TV / anime
  const details = (await tmdbGet(`/tv/${id}`, {})) as TmdbTvDetails | null;
  if (!details) return null;

  const mainTitle = details.name ?? title;
  const year = details.first_air_date && details.first_air_date.length >= 4 ? Number(details.first_air_date.slice(0, 4)) : undefined;
  const posterUrl = details.poster_path ? `${TMDB_IMAGE_BASE}${details.poster_path}` : null;

  const [credits, providers] = await Promise.all([
    tmdbGet(`/tv/${id}/credits`, {}) as Promise<TmdbCreditsResponse | null>,
    tmdbGet(`/tv/${id}/watch/providers`, {}) as Promise<TmdbWatchProvidersResponse | null>,
  ]);
  const cast = (credits?.cast ?? [])
    .slice(0, 3)
    .map((c) => c.name)
    .filter((n): n is string => Boolean(n));
  const { ottName, watchUrl } = resolveWatchInfo(providers, mainTitle);
  const creator = details.created_by?.[0] ?? null;

  // Tier 1: TMDB has no "collection" concept for TV, so this is a best-effort
  // stand-in — strip a season/cour suffix (같은 heuristic as searchPoster) and
  // search for other shows sharing that title stem (e.g. split-cour anime).
  const stem = mainTitle.replace(/\s*(시즌\s*\d+|파트\s*\d+|\d+\s*기)\s*$/u, "").trim();
  if (stem) {
    const stemSearch = await tmdbGet("/search/tv", { query: stem });
    const stemLower = stem.toLowerCase();
    const series = ((stemSearch?.results ?? []) as TmdbMultiSearchResult[])
      .filter((r) => !seen.has(r.id) && (r.name ?? "").toLowerCase().startsWith(stemLower))
      .map((r) => toTitleSuggestion({ id: r.id, name: r.name, first_air_date: r.first_air_date, poster_path: r.poster_path }, "tv"))
      .filter((r): r is TitleSuggestion => r !== null);
    series.forEach((s) => seen.add(s.id));
    const resolvedSeries = await resolveOttForItems(series.slice(0, 10), "tv");
    if (resolvedSeries.length > 0) groups.push({ label: "시리즈", items: resolvedSeries });
  }

  // Tier 2: same creator's other shows
  if (creator?.id) {
    const personCredits = (await tmdbGet(`/person/${creator.id}/tv_credits`, {})) as TmdbPersonTvCredits | null;
    const created = (personCredits?.crew ?? [])
      .filter((c) => !seen.has(c.id))
      .sort((a, b) => (b.first_air_date ?? "").localeCompare(a.first_air_date ?? ""))
      .map((c) => toTitleSuggestion(c, "tv"))
      .filter((c): c is TitleSuggestion => c !== null);
    created.forEach((c) => seen.add(c.id));
    const resolvedCreated = await resolveOttForItems(created.slice(0, 10), "tv");
    if (resolvedCreated.length > 0) groups.push({ label: `${creator.name ?? "같은"} 제작자의 다른 작품`, items: resolvedCreated });
  }

  // Tier 3: TMDB's own similarity engine
  const recs = (await tmdbGet(`/tv/${id}/recommendations`, {})) as TmdbRecommendationsResponse | null;
  const similar = (recs?.results ?? [])
    .filter((r) => !seen.has(r.id))
    .map((r) => toTitleSuggestion(r, "tv"))
    .filter((r): r is TitleSuggestion => r !== null);
  const resolvedSimilar = await resolveOttForItems(similar.slice(0, 10), "tv");
  if (resolvedSimilar.length > 0) groups.push({ label: "비슷한 장르의 작품", items: resolvedSimilar });

  return {
    main: { id, title: mainTitle, year, mediaType: "tv", posterUrl, director: creator?.name ?? null, cast, ottName, watchUrl },
    groups,
  };
}
