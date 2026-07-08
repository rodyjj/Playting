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

  return resolved.filter((item): item is TrendingTitle => item !== null).slice(0, limit);
}
