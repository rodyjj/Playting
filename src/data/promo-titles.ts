export type PromoMediaType = "movie" | "tv" | "anime";

export type PromoTitle = {
  id: string;
  title: string;
  ott: string;
  year: number;
  mediaType: PromoMediaType;
};

export const PROMO_TITLES: PromoTitle[] = [
  { id: "the-east-palace", title: "동궁", ott: "넷플릭스", year: 2026, mediaType: "tv" },
  { id: "silo", title: "사일로", ott: "Apple TV", year: 2023, mediaType: "tv" },
  { id: "pyramid-game", title: "피라미드 게임", ott: "티빙", year: 2024, mediaType: "tv" },
  { id: "absolute-value-of-romance", title: "로맨스의 절댓값", ott: "쿠팡플레이", year: 2026, mediaType: "tv" },
  { id: "perfect-crown", title: "21세기 대군부인", ott: "디즈니+", year: 2026, mediaType: "tv" },
  { id: "possible-love", title: "가능한 사랑", ott: "넷플릭스", year: 2026, mediaType: "movie" },
  { id: "remarried-empress", title: "재혼황후", ott: "디즈니+", year: 2026, mediaType: "tv" },
  { id: "judge-lee-han-young", title: "판사 이한영", ott: "웨이브", year: 2026, mediaType: "tv" },
  { id: "family-plan", title: "가족계획", ott: "쿠팡플레이", year: 2026, mediaType: "tv" },
  { id: "undercover-miss-hong", title: "언더커버 미쓰홍", ott: "티빙", year: 2026, mediaType: "tv" },
  { id: "lucky", title: "Lucky", ott: "Apple TV", year: 2026, mediaType: "tv" },
  { id: "cross", title: "Cross", ott: "프라임비디오", year: 2026, mediaType: "tv" },
  { id: "the-housemaid", title: "The Housemaid", ott: "왓챠", year: 2026, mediaType: "movie" },
  { id: "mushoku-tensei-3", title: "무직전생 3기", ott: "라프텔", year: 2026, mediaType: "anime" },
  { id: "oneroom-tutor", title: "원룸 조교님", ott: "라프텔", year: 2026, mediaType: "anime" },
];
