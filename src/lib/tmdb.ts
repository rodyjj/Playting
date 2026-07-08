const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

export type PosterMediaType = "movie" | "tv" | "anime";

type TmdbSearchResult = {
  poster_path: string | null;
  media_type?: string;
};

async function tmdbGet(path: string, params: Record<string, string>) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;

  const qs = new URLSearchParams({
    api_key: apiKey,
    language: "ko-KR",
    include_adult: "false",
    ...params,
  });

  const res = await fetch(`${TMDB_BASE}${path}?${qs.toString()}`, {
    next: { revalidate: 60 * 60 * 24 },
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

// Maps TMDB's (usually English) watch-provider names to this app's Korean OTT display names.
const OTT_NAME_MAP: Record<string, string> = {
  Netflix: "넷플릭스",
  "Disney Plus": "디즈니+",
  "Coupang Play": "쿠팡플레이",
  "Apple TV Plus": "Apple TV",
  "Apple TV+": "Apple TV",
  TVING: "티빙",
  Watcha: "왓챠",
  Wavve: "웨이브",
  Laftel: "라프텔",
  "Amazon Prime Video": "프라임비디오",
  "Prime Video": "프라임비디오",
};

type TmdbCreditsResponse = {
  cast?: Array<{ name?: string }>;
  crew?: Array<{ name?: string; job?: string }>;
};

type TmdbWatchProvidersResponse = {
  results?: Record<string, { flatrate?: Array<{ provider_name?: string }>; link?: string }>;
};

/**
 * Director, top cast, KR streaming provider, and a "watch now" link for the
 * menu-board detail card. `watchUrl` is TMDB's JustWatch-attributed aggregation
 * link (the only "where to watch" deep link available without each OTT's own
 * API) — it lands the user on a page listing exactly where the title streams.
 */
export async function getTitleDetails({
  id,
  mediaType,
}: {
  id: number;
  mediaType: "movie" | "tv";
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

  const providerName = providers?.results?.KR?.flatrate?.[0]?.provider_name;
  const ottName = providerName ? (OTT_NAME_MAP[providerName] ?? providerName) : null;
  const watchUrl = providers?.results?.KR?.link ?? null;

  return { director, cast, ottName, watchUrl };
}
