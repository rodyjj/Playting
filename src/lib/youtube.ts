const YOUTUBE_BASE = "https://www.googleapis.com/youtube/v3";

// YOUTUBE_API_KEY may hold one key or a comma-separated list of several — one
// per Google Cloud project. search.list has its own tiny separate quota
// (100 calls/day/project by default), easy to exhaust with real booth
// traffic; spreading calls across several projects' keys multiplies that
// ceiling without needing per-key code changes.
function getApiKeys(): string[] {
  const raw = process.env.YOUTUBE_API_KEY;
  if (!raw) return [];
  return raw
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}

export function isYoutubeConfigured(): boolean {
  return getApiKeys().length > 0;
}

export type YoutubeVideo = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
};

export type TimedYoutubeVideo = YoutubeVideo & {
  durationSeconds: number;
};

type YoutubeSearchItem = {
  id?: { videoId?: string };
  snippet?: { title?: string; channelTitle?: string; thumbnails?: { medium?: { url?: string } } };
};

// The API returns titles/channel names HTML-escaped (e.g. "&#39;기생충&#39;") — unescape for display.
const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&#39;": "'",
  "&quot;": '"',
  "&lt;": "<",
  "&gt;": ">",
};

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(amp|#39|quot|lt|gt);/g, (match) => HTML_ENTITIES[match] ?? match);
}

// Remembers which key last worked so a call doesn't re-try already-exhausted
// keys from the front of the list every single time — advances forward
// (never back to an earlier key) as each one runs out of quota over the day.
let activeKeyIndex = 0;

/**
 * Tries each configured key in turn, starting from the last known-good one,
 * and returns the first successful response. A quota-exceeded (or any other
 * failed) response just falls through to the next key rather than giving up —
 * Google rejects over-quota requests before they consume anything, so this
 * costs nothing extra beyond the failed round-trip itself.
 */
async function youtubeFetch(path: string, params: Record<string, string>): Promise<Response | null> {
  const keys = getApiKeys();
  if (keys.length === 0) return null;

  for (let attempt = 0; attempt < keys.length; attempt++) {
    const index = (activeKeyIndex + attempt) % keys.length;
    const qs = new URLSearchParams({ ...params, key: keys[index] });
    const res = await fetch(`${YOUTUBE_BASE}${path}?${qs.toString()}`, {
      next: { revalidate: 60 * 60 * 24 },
    });
    if (res.ok) {
      activeKeyIndex = index;
      return res;
    }
  }
  return null;
}

async function searchYoutube(query: string, max: number): Promise<YoutubeVideo[]> {
  const res = await youtubeFetch("/search", {
    part: "snippet",
    type: "video",
    maxResults: String(max),
    relevanceLanguage: "ko",
    safeSearch: "none",
    q: query,
  });
  if (!res) return [];

  const data = (await res.json()) as { items?: YoutubeSearchItem[] };
  return (data.items ?? [])
    .map((item) => ({
      videoId: item.id?.videoId ?? "",
      title: decodeHtmlEntities(item.snippet?.title ?? ""),
      channelTitle: decodeHtmlEntities(item.snippet?.channelTitle ?? ""),
      thumbnailUrl: item.snippet?.thumbnails?.medium?.url ?? "",
    }))
    .filter((video) => video.videoId);
}

// "PT1H2M3S" -> 3723. Any missing component (e.g. no hours) is just absent
// from the match, so this handles "PT45S", "PT12M", "PT1H30M" etc. uniformly.
function parseIsoDuration(iso: string): number {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return 0;
  const [, h, m, s] = match;
  return Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0);
}

/**
 * search.list can't filter by video length, so this adds one videos.list
 * call (1 quota unit, batched across all candidates) to read each result's
 * actual duration and keep only the first one landing inside `range` — used
 * to tell a YouTube Shorts clip apart from a 15-minute recap or a 40-minute
 * binge-recap video, which all just look like "a video" to search.list.
 *
 * `isRelevant`, when given, is checked too: a plain keyword search for e.g.
 * "담배 고양이 쇼츠" can return a completely unrelated short that just happens
 * to share a word with the title (a real-life smoking vlog matching on
 * "담배"/cigarette) — duration alone can't catch that, so callers that know
 * what the video is *supposed* to be about should pass a check for it here
 * rather than trusting search relevance blindly.
 */
export async function searchVideoByDuration(
  query: string,
  range: { min: number; max?: number },
  options?: { max?: number; isRelevant?: (video: YoutubeVideo) => boolean }
): Promise<TimedYoutubeVideo | null> {
  if (!isYoutubeConfigured()) return null;

  const max = options?.max ?? 8;
  const isRelevant = options?.isRelevant;

  const candidates = await searchYoutube(query, max);
  if (candidates.length === 0) return null;

  const res = await youtubeFetch("/videos", {
    part: "contentDetails",
    id: candidates.map((c) => c.videoId).join(","),
  });
  if (!res) return null;

  const data = (await res.json()) as { items?: { id?: string; contentDetails?: { duration?: string } }[] };
  const durations = new Map(
    (data.items ?? []).map((item) => [item.id, parseIsoDuration(item.contentDetails?.duration ?? "")])
  );

  for (const candidate of candidates) {
    const durationSeconds = durations.get(candidate.videoId);
    if (durationSeconds === undefined) continue;
    if (durationSeconds < range.min) continue;
    if (range.max !== undefined && durationSeconds > range.max) continue;
    if (isRelevant && !isRelevant(candidate)) continue;
    return { ...candidate, durationSeconds };
  }
  return null;
}

/**
 * Korean PV/trailer first (relevanceLanguage + a Korean query already biases
 * results toward Korean-dubbed or Korean-subtitled uploads); only falls back
 * to an English "official trailer" search when that comes up empty.
 */
export async function findTrailer(title: string, year?: number): Promise<YoutubeVideo | null> {
  const yearStr = year ? ` ${year}` : "";
  const korean = await searchYoutube(`${title}${yearStr} 예고편`, 3);
  if (korean[0]) return korean[0];

  const english = await searchYoutube(`${title}${yearStr} official trailer`, 3);
  return english[0] ?? null;
}

export async function findSupplementaryVideos(query: string, max: number): Promise<YoutubeVideo[]> {
  return searchYoutube(query, max);
}
