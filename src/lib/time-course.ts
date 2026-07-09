import { unstable_cache } from "next/cache";
import { getCombinedRanking, getTrendingWithWatchLinks } from "./tmdb";
import { selectTimeCourseTitles, type TimeCourseCandidate } from "./gemini";
import { searchVideoByDuration, type YoutubeVideo } from "./youtube";
import { TIME_BANDS, kstMinuteOfDay, type TimeBand } from "./time-bands";

// ---- TEMPORARY quota guard — delete this block (and its one call site in
// the API route) once this ships to real users. ----
// While this is still a low-traffic test build, there's no point spending
// the free YouTube (10,000 units/day) or Gemini (20 requests/day) quota
// outside hours anyone might actually be looking, especially overnight.
// Set TIME_COURSE_FORCE_LIVE=1 in .env.local to bypass this while actively
// developing/testing the feature.
const ACTIVE_HOURS = { start: 8 * 60, end: 22 * 60 }; // KST, 08:00–22:00

export function isTimeCourseQuietHours(now: Date = new Date()): boolean {
  if (process.env.TIME_COURSE_FORCE_LIVE === "1") return false;
  const minuteOfDay = kstMinuteOfDay(now);
  return minuteOfDay < ACTIVE_HOURS.start || minuteOfDay >= ACTIVE_HOURS.end;
}
// ---- end temporary quota guard ----

// Hand-picked past blockbusters/classics — "역대 빅히트 대작" has no API
// (TMDB's own popularity skews toward what's trending *now*, not all-time
// greats), so this is the one part of the candidate pool that's static.
const CLASSIC_HITS: TimeCourseCandidate[] = [
  { title: "반지의 제왕: 반지 원정대", year: 2001, mediaType: "movie" },
  { title: "반지의 제왕: 두 개의 탑", year: 2002, mediaType: "movie" },
  { title: "반지의 제왕: 왕의 귀환", year: 2003, mediaType: "movie" },
  { title: "인터스텔라", year: 2014, mediaType: "movie" },
  { title: "다크 나이트", year: 2008, mediaType: "movie" },
  { title: "기생충", year: 2019, mediaType: "movie" },
  { title: "어벤져스: 엔드게임", year: 2019, mediaType: "movie" },
  { title: "나 홀로 집에", year: 1990, mediaType: "movie" },
  { title: "타이타닉", year: 1997, mediaType: "movie" },
  { title: "매트릭스", year: 1999, mediaType: "movie" },
  { title: "라라랜드", year: 2016, mediaType: "movie" },
  { title: "헤어질 결심", year: 2022, mediaType: "movie" },
  { title: "부산행", year: 2016, mediaType: "movie" },
  { title: "위쳐", year: 2019, mediaType: "tv" },
  { title: "왕좌의 게임", year: 2011, mediaType: "tv" },
  { title: "오징어 게임", year: 2021, mediaType: "tv" },
  { title: "스토브리그", year: 2019, mediaType: "tv" },
  { title: "미나리", year: 2020, mediaType: "movie" },
  { title: "올드보이", year: 2003, mediaType: "movie" },
  { title: "신과함께-죄와 벌", year: 2017, mediaType: "movie" },
  { title: "극한직업", year: 2019, mediaType: "movie" },
  { title: "도둑들", year: 2012, mediaType: "movie" },
  { title: "응답하라 1988", year: 2015, mediaType: "tv" },
  { title: "이상한 변호사 우영우", year: 2022, mediaType: "tv" },
];

/**
 * Merges "popular on OTT right now" + "all-time hits" + "recent buzz" into
 * one deduped candidate list for Gemini to choose from. None of this needs
 * per-user info, so it's safe to compute once and let Next's own fetch cache
 * (already set inside getCombinedRanking/getTrendingWithWatchLinks) carry it.
 */
async function getCandidatePool(): Promise<TimeCourseCandidate[]> {
  const [ranking, trending] = await Promise.all([getCombinedRanking(20), getTrendingWithWatchLinks(15)]);

  const pool: TimeCourseCandidate[] = [
    ...ranking.map((r) => ({ title: r.title, year: r.year, mediaType: r.mediaType })),
    ...CLASSIC_HITS,
    ...trending.map((t) => ({ title: t.title, year: t.year, mediaType: t.mediaType })),
  ];

  const seen = new Set<string>();
  return pool.filter((item) => {
    const key = item.title.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Shorts themselves rarely have the literal word "쇼츠" in their upload
// title (it's a video *format*, not something uploaders tag by hand) — so
// appending it to the query mostly just filters out the real shorts. The
// duration range plus the relevance check below already do the work of
// telling a short apart from an unrelated video, so morning's query is just
// the bare title. Lunch/dinner's extra words are kept since those recap
// genres genuinely do use "요약"/"정주행" in their own titles.
const BAND_QUERY: Record<TimeBand, (title: string) => string> = {
  morning: (title) => title,
  lunch: (title) => `${title} 요약`,
  dinner: (title) => `${title} 정주행`,
};

// Seconds. Shorts run well under a minute in practice, but the "쇼츠" query
// itself already biases results that direction — 180s just guards against a
// same-titled long-form video slipping through. Lunch's upper bound is eased
// past the requested 20 minutes to 21 so a slightly-over summary isn't
// dropped for a rounding error. Dinner has no ceiling — a full binge-recap
// can run well past an hour.
const BAND_DURATION: Record<TimeBand, { min: number; max?: number }> = {
  morning: { min: 0, max: 180 },
  lunch: { min: 480, max: 1260 },
  dinner: { min: 1500 },
};

export type CuratedVideo = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  durationSeconds: number;
  workTitle: string;
  workYear?: number;
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[\s~:()·\-_.,!?'"…]/g, "");
}

/**
 * Titles like `무직전생 ~이세계에 갔으면 최선을 다한다~` or `신과함께-죄와 벌`
 * only ever show up in *other* videos' titles under their short, well-known
 * name — cut at the first separator so the relevance check matches on that,
 * rather than demanding the full subtitle appear verbatim.
 */
function coreTitle(workTitle: string): string {
  return normalize(workTitle.split(/[~:()·\-]/)[0] ?? workTitle);
}

/**
 * A plain "<title> 쇼츠"-style search can return something that only shares
 * a word with the title (e.g. a real-life smoking vlog for the anime "담배
 * 고양이", matching on "담배") — reject anything whose title doesn't actually
 * mention the work, rather than trusting search relevance blindly. Channel
 * name is deliberately excluded: a creator's handle coincidentally
 * containing the core title (e.g. a channel called "루키치" for the show
 * "루키") is not evidence the video is about that work.
 */
function isAboutWork(video: YoutubeVideo, workTitle: string): boolean {
  const core = coreTitle(workTitle);
  if (!core) return true;
  return normalize(video.title).includes(core);
}

async function buildBand(band: TimeBand, genres: string[]): Promise<CuratedVideo[]> {
  const pool = await getCandidatePool();
  const picked = await selectTimeCourseTitles({ band, pool, genres });
  const candidates = picked.length > 0 ? picked : pool.slice(0, 10);

  const videos = await Promise.all(
    candidates.map(async (candidate): Promise<CuratedVideo | null> => {
      const video = await searchVideoByDuration(BAND_QUERY[band](candidate.title), BAND_DURATION[band], {
        isRelevant: (v) => isAboutWork(v, candidate.title),
      });
      if (!video) return null;
      return { ...video, workTitle: candidate.title, workYear: candidate.year };
    })
  );

  return videos.filter((v): v is CuratedVideo => v !== null);
}

/**
 * The Gemini + per-title YouTube lookups are the expensive part (quota-wise)
 * — cached per (band, genre set) for 6 hours so they run at most a handful of
 * times a day rather than once per page view. `genres` is the only
 * preference folded in here (see selectTimeCourseTitles for why the others
 * aren't); sort the array before calling so equivalent genre sets share a
 * cache entry regardless of selection order.
 */
export const getTimeCourseBand = unstable_cache(buildBand, ["time-course-band"], {
  revalidate: 60 * 60 * 6,
});

/** Off-hours fallback (no band currently active): a taste of all three. */
export async function getMixedTimeCourse(genres: string[]): Promise<CuratedVideo[]> {
  const perBand = await Promise.all(TIME_BANDS.map((band) => getTimeCourseBand(band, genres)));
  return perBand.flatMap((videos) => videos.slice(0, 2));
}
