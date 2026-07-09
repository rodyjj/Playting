import { unstable_cache } from "next/cache";
import { searchTitles, type RankingTitle } from "./tmdb";

// Netflix's own open dataset (no key, no auth) behind its public Top 10 site —
// actual KR viewership-based weekly rankings, refreshed every Tuesday. Far
// more accurate for the Netflix tab than TMDB's global `popularity` proxy,
// which is what every other platform tab still relies on (see tmdb.ts).
const TUDUM_TOP10_URL = "https://www.netflix.com/tudum/top10/data/all-weeks-countries.tsv";
const NETFLIX_SEARCH_URL = (title: string) => `https://www.netflix.com/search?q=${encodeURIComponent(title)}`;

type TudumCategory = "Films" | "TV";

type TudumRow = {
  week: string;
  category: TudumCategory;
  weeklyRank: number;
  showTitle: string;
};

async function fetchLatestKrRows(): Promise<{ week: string; rows: TudumRow[] }> {
  // This file is ~40MB (every country's full history) — well over Next's 2MB
  // per-entry data-cache limit, so `next.revalidate` can't cache it (it just
  // fails to cache and re-downloads 40MB on every call). Skip Next's fetch
  // cache entirely and instead cache the tiny *parsed+resolved* result below
  // via unstable_cache, so this 40MB download only happens once per revalidate window.
  const res = await fetch(TUDUM_TOP10_URL, { cache: "no-store" });
  if (!res.ok) return { week: "", rows: [] };

  const text = await res.text();
  const lines = text.split("\n");
  const krRows: TudumRow[] = [];

  // country_name  country_iso2  week  category  weekly_rank  show_title  season_title  cumulative_weeks_in_top_10
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = line.split("\t");
    if (cols[0] !== "South Korea") continue;
    const category = cols[3];
    if (category !== "Films" && category !== "TV") continue;
    krRows.push({
      week: cols[2],
      category,
      weeklyRank: Number(cols[4]),
      showTitle: (cols[5] ?? "").trim(),
    });
  }

  const latestWeek = krRows.reduce((max, r) => (r.week > max ? r.week : max), "");
  return { week: latestWeek, rows: krRows.filter((r) => r.week === latestWeek) };
}

async function resolveRow(row: TudumRow): Promise<RankingTitle | null> {
  if (!row.showTitle) return null;
  const mediaType = row.category === "Films" ? "movie" : "tv";
  const suggestions = await searchTitles(row.showTitle);
  const match = suggestions.find((s) => s.mediaType === mediaType && s.posterUrl) ?? suggestions.find((s) => s.posterUrl);
  if (!match?.posterUrl) return null;

  return {
    rank: row.weeklyRank,
    id: match.id,
    mediaType: match.mediaType,
    title: match.title,
    year: match.year,
    posterUrl: match.posterUrl,
    popularity: 0,
    ott: "넷플릭스",
    watchUrl: NETFLIX_SEARCH_URL(match.title),
  };
}

export type RankingSection = {
  label: string;
  items: RankingTitle[];
};

/**
 * Netflix publishes Films and TV as two separate Top 10s (never a merged
 * chart), so this mirrors that instead of forcing them into one fake ranking.
 * Titles that TMDB can't resolve to a poster are dropped rather than shown
 * broken; remaining ranks are NOT renumbered, so gaps reflect real misses.
 */
async function buildNetflixTop10Sections(): Promise<{ sections: RankingSection[]; weekOf: string | null }> {
  const { week, rows } = await fetchLatestKrRows();
  if (!week) return { sections: [], weekOf: null };

  const films = rows.filter((r) => r.category === "Films").sort((a, b) => a.weeklyRank - b.weeklyRank);
  const shows = rows.filter((r) => r.category === "TV").sort((a, b) => a.weeklyRank - b.weeklyRank);

  const [filmItems, showItems] = await Promise.all([
    Promise.all(films.map(resolveRow)),
    Promise.all(shows.map(resolveRow)),
  ]);

  return {
    weekOf: week,
    sections: [
      { label: "영화 TOP 10", items: filmItems.filter((x): x is RankingTitle => x !== null) },
      { label: "시리즈 TOP 10", items: showItems.filter((x): x is RankingTitle => x !== null) },
    ],
  };
}

// The 40MB download + parse + up to 20 TMDB lookups only needs to run once
// per revalidate window — unstable_cache stores just the resulting JSON
// (a few KB, well under the 2MB limit that blocks caching the raw file above).
export const getNetflixTop10Sections = unstable_cache(buildNetflixTop10Sections, ["netflix-top10-kr"], {
  revalidate: 60 * 60 * 24,
});
