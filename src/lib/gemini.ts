import { GoogleGenAI } from "@google/genai";
import { OTT_PROVIDERS } from "@/data/ott-providers";

const MODEL = "gemini-2.5-flash";

export type CourseMediaType = "movie" | "tv" | "anime";

export type CourseItem = {
  title: string;
  ott: string;
  year: number;
  mediaType: CourseMediaType;
};

export type Course = {
  title: string;
  emoji: string;
  theme: string;
  items: CourseItem[];
};

const COURSE_SCHEMA = {
  type: "object",
  properties: {
    courses: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description:
              "코스 이름. 반드시 '코스'라는 단어로 끝나야 합니다. 가능하면 '{작품들 전체를 대표하는 한 단어/짧은 문구}맛 코스' 형태로 지어주세요. 텍스트만 사용하고 이모지는 절대 포함하지 마세요 (이모지는 emoji 필드에 따로 있습니다). 예: '화약맛 코스' (O), '전쟁 영화 모음' (X - '코스'로 안 끝남), '🧨화약맛 코스' (X - 이모지 포함)",
          },
          emoji: {
            type: "string",
            description: "코스 분위기를 나타내는 이모지. 반드시 정확히 1개의 이모지 문자만 담아야 합니다. 절대 2개 이상 넣지 마세요. 예: '🎬' (O), '🎬🍿' (X)",
          },
          theme: {
            type: "string",
            description: "이 코스가 기반한 장르 또는 인물 태그. 예: '#전쟁'",
          },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "실존하는 영화/드라마/애니메이션 제목" },
                ott: {
                  type: "string",
                  description:
                    "넷플릭스, 디즈니+, 쿠팡플레이, Apple TV, 티빙, 왓챠, 웨이브, 라프텔, 프라임비디오, 씨네폭스 중 하나 (가장 가능성 높은 플랫폼 추정)",
                },
                year: { type: "integer" },
                mediaType: { type: "string", enum: ["movie", "tv", "anime"] },
              },
              required: ["title", "ott", "year", "mediaType"],
              additionalProperties: false,
            },
          },
        },
        required: ["title", "emoji", "theme", "items"],
        additionalProperties: false,
      },
    },
  },
  required: ["courses"],
  additionalProperties: false,
} as const;

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * The free Gemini tier's per-minute rate limit is easy to hit when a single
 * shared API key serves every visitor (booth demo, small deployment) — a
 * 429/503 here would otherwise surface as "recommendations silently vanished"
 * on the home screen. Retries with a short backoff before giving up.
 */
async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: Parameters<GoogleGenAI["models"]["generateContent"]>[0],
  attempts = 3
): Promise<Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error) {
      if (attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 800));
    }
  }
  throw new Error("unreachable");
}

/**
 * Keeps only the first grapheme cluster so multi-codepoint emoji (flags, ZWJ
 * sequences, skin-tone modifiers) survive intact — the model doesn't always
 * follow the "exactly one emoji" instruction, so this enforces it regardless.
 */
function firstEmoji(value: string): string {
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const first = segmenter.segment(value)[Symbol.iterator]().next();
  return first.done ? value : first.value.segment;
}

// Emoji sequence: a pictograph, optionally ZWJ-joined to more pictographs, with an optional variation selector.
const EMOJI_SEQUENCE = /\p{Extended_Pictographic}(‍\p{Extended_Pictographic})*️?/gu;

/**
 * Belt-and-suspenders for course titles: the emoji is already rendered from
 * its own field, so any emoji the model also slips into the title text would
 * show up doubled on screen. Strip it regardless of prompt compliance.
 */
function stripEmoji(value: string): string {
  return value.replace(EMOJI_SEQUENCE, "").replace(/\s+/g, " ").trim();
}

/** Guarantees the "코스" naming rule regardless of prompt compliance. */
function ensureCourseSuffix(title: string): string {
  return title.includes("코스") ? title : `${title} 코스`;
}

/**
 * Puts items on the user's subscribed platforms first (their whole reason for
 * being in this course already reflects thematic relevance — Gemini only adds
 * items it judged to fit — so a stable sort on "is it subscribed" is enough
 * to satisfy the 1순위/2순위 ordering without re-litigating theme fit here).
 */
function prioritizeSubscribed(items: CourseItem[], subscribedOttNames: Set<string>): CourseItem[] {
  return [...items].sort((a, b) => {
    const aSubscribed = subscribedOttNames.has(a.ott) ? 0 : 1;
    const bSubscribed = subscribedOttNames.has(b.ott) ? 0 : 1;
    return aSubscribed - bSubscribed;
  });
}

/**
 * Groups the user's preferred genres/people into a few themed "course" bundles
 * (a title + emoji + a short list of real titles), mirroring a tasting-menu course.
 */
export async function generateCourses({
  genres,
  people,
  subscribedOtt,
}: {
  genres: string[];
  people: string[];
  subscribedOtt: string[];
}): Promise<Course[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [];

  const ai = new GoogleGenAI({ apiKey });

  const subscribedOttNames = new Set(
    subscribedOtt
      .map((id) => OTT_PROVIDERS.find((p) => p.id === id)?.name)
      .filter((name): name is string => Boolean(name))
  );

  const preferenceLines = [
    genres.length > 0 ? `선호 장르: ${genres.map((g) => `#${g}`).join(", ")}` : null,
    people.length > 0 ? `선호 감독/배우: ${people.join(", ")}` : null,
    subscribedOttNames.size > 0
      ? `사용자가 구독 중인 OTT: ${[...subscribedOttNames].join(", ")} (참고용 — 반드시 이 플랫폼에서만 고를 필요는 없습니다)`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `당신은 OTT 콘텐츠 추천 서비스 "Playting"의 AI 셰프입니다.
사용자의 취향에 맞는 영화/드라마/애니메이션을 몇 개의 "감상 코스"로 묶어서 추천해주세요.
마치 레스토랑의 코스 요리처럼, 하나의 코스는 비슷한 주제/분위기의 작품들로 구성됩니다.

${preferenceLines}

규칙:
- 2~3개의 코스를 만들어주세요.
- 각 코스에는 8~10개의 작품을 담아주세요 (사용자가 옆으로 스크롤하며 더 볼 수 있도록 충분히 풍성하게).
- 각 코스는 실제로 존재하는 영화/드라마/애니메이션만 포함해야 합니다 (지어내지 마세요).
- 코스 제목(title)은 반드시 "코스"라는 단어로 끝나야 합니다. 가능하면 그 코스에 담긴 작품들 전체를 대표하는 한 단어나 짧은 문구 뒤에 "맛"을 붙인 "OO맛 코스" 형태로 지어주세요 (예: "화약맛 코스", "풋풋한 첫사랑맛 코스"). 이모지는 넣지 말고 emoji 필드에만 넣으세요.
- theme 필드에는 이 코스가 기반한 장르나 인물을 "#태그" 형태로 적어주세요.
- 각 코스 안에서 작품들은 하나의 OTT에 몰리지 않고 다양한 플랫폼에서 고르게 선택해주세요.
- 사용자가 선호 감독/배우를 입력했다면, 그중 최소 한 코스는 그 인물의 대표작 위주로 구성해주세요.`;

  const response = await generateContentWithRetry(ai, {
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: COURSE_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) return [];

  try {
    const parsed = JSON.parse(text) as { courses: Course[] };
    return (parsed.courses ?? []).map((course) => ({
      ...course,
      title: ensureCourseSuffix(stripEmoji(course.title)),
      emoji: firstEmoji(course.emoji),
      items: prioritizeSubscribed(course.items, subscribedOttNames),
    }));
  } catch {
    return [];
  }
}

export type DessertCategory = "true_story" | "complex_lore" | "director_focused" | "music_focused" | "general";

export type DessertStrategy = {
  category: DessertCategory;
  searchQuery: string;
};

const DESSERT_STRATEGY_SCHEMA = {
  type: "object",
  properties: {
    category: {
      type: "string",
      enum: ["true_story", "complex_lore", "director_focused", "music_focused", "general"],
      description:
        "true_story: 실화 기반 / complex_lore: 세계관·서사가 복잡하거나 시리즈가 긴 작품 / director_focused: 감독의 색깔이 강한 작품 / music_focused: 음악이 핵심인 작품 / general: 위에 해당하지 않음",
    },
    searchQuery: {
      type: "string",
      description: "선택한 category에 맞춰 유튜브에서 보조 영상을 찾기 위한 한국어 검색어. 실제 작품명을 포함해야 합니다.",
    },
  },
  required: ["category", "searchQuery"],
  additionalProperties: false,
} as const;

/**
 * Picks which flavor of "디저트" supplementary video fits the selected main dish
 * (true-story explainer, lore recap, director interview, or OST) and produces
 * the Korean YouTube search query to find it — the actual search happens in
 * the youtube.ts caller, this only decides the angle and phrasing.
 */
export async function analyzeDessertStrategy({
  title,
  year,
  director,
}: {
  title: string;
  year?: number;
  director?: string | null;
}): Promise<DessertStrategy> {
  const fallback: DessertStrategy = { category: "general", searchQuery: `${title} 비하인드` };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallback;

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `당신은 OTT 콘텐츠 큐레이터입니다. 아래 작품을 시청한 사용자가 더 깊이 몰입할 수 있도록, 유튜브에서 찾아볼 보조 영상의 방향을 정해주세요.

작품: ${title}${year ? ` (${year})` : ""}
감독: ${director ?? "정보 없음"}

category는 다음 중 이 작품에 가장 잘 맞는 하나를 고르세요:
- true_story: 실화를 바탕으로 한 작품 → 배경이 된 실제 사건을 다루는 해설/다큐 영상
- complex_lore: 세계관이 복잡하거나 시리즈가 길어 설정 이해가 필요한 작품 → 해석·설정 정리 영상
- director_focused: 감독 특유의 스타일이 두드러지는 작품 → 감독 인터뷰 또는 제작 비하인드 영상
- music_focused: 음악/OST가 작품의 핵심 요소인 작품 → OST 모음 또는 음악 제작 과정 영상
- general: 위 어디에도 뚜렷하게 해당하지 않는 작품 → 일반적인 비하인드 스토리 영상

searchQuery에는 실제 작품명을 포함한, 유튜브에서 바로 검색할 수 있는 한국어 검색어를 만들어주세요.`;

  const response = await generateContentWithRetry(ai, {
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: DESSERT_STRATEGY_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) return fallback;

  try {
    return JSON.parse(text) as DessertStrategy;
  } catch {
    return fallback;
  }
}
