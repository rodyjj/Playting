const YOUTUBE_BASE = "https://www.googleapis.com/youtube/v3";

export function isYoutubeConfigured(): boolean {
  return Boolean(process.env.YOUTUBE_API_KEY);
}

export type YoutubeVideo = {
  videoId: string;
  title: string;
  channelTitle: string;
};

type YoutubeSearchItem = {
  id?: { videoId?: string };
  snippet?: { title?: string; channelTitle?: string };
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

async function searchYoutube(query: string, max: number): Promise<YoutubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  const qs = new URLSearchParams({
    key: apiKey,
    part: "snippet",
    type: "video",
    maxResults: String(max),
    relevanceLanguage: "ko",
    safeSearch: "none",
    q: query,
  });

  const res = await fetch(`${YOUTUBE_BASE}/search?${qs.toString()}`, {
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as { items?: YoutubeSearchItem[] };
  return (data.items ?? [])
    .map((item) => ({
      videoId: item.id?.videoId ?? "",
      title: decodeHtmlEntities(item.snippet?.title ?? ""),
      channelTitle: decodeHtmlEntities(item.snippet?.channelTitle ?? ""),
    }))
    .filter((video) => video.videoId);
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
