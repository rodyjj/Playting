export type GenreCategory = "감성" | "긴장감" | "액션·모험" | "상상력" | "현실·시사" | "시대극" | "라이프스타일";

export type Genre = {
  id: string;
  label: string;
  category: GenreCategory;
};

// Render order for the grouped genre grid in GenreStep.
export const GENRE_CATEGORIES: GenreCategory[] = [
  "감성",
  "긴장감",
  "액션·모험",
  "상상력",
  "현실·시사",
  "시대극",
  "라이프스타일",
];

export const GENRES: Genre[] = [
  { id: "romance", label: "로맨스", category: "감성" },
  { id: "comedy", label: "코미디", category: "감성" },
  { id: "drama", label: "드라마", category: "감성" },
  { id: "family", label: "가족", category: "감성" },
  { id: "musical", label: "뮤지컬", category: "감성" },
  { id: "coming-of-age", label: "성장", category: "감성" },
  { id: "healing", label: "힐링", category: "감성" },
  { id: "sitcom", label: "시트콤", category: "감성" },

  { id: "thriller", label: "스릴러", category: "긴장감" },
  { id: "mystery", label: "미스터리", category: "긴장감" },
  { id: "crime", label: "범죄", category: "긴장감" },
  { id: "noir", label: "느와르", category: "긴장감" },
  { id: "espionage", label: "첩보", category: "긴장감" },
  { id: "disaster", label: "재난", category: "긴장감" },

  { id: "action", label: "액션", category: "액션·모험" },
  { id: "war", label: "전쟁", category: "액션·모험" },
  { id: "martial-arts", label: "무협", category: "액션·모험" },
  { id: "adventure", label: "모험", category: "액션·모험" },

  { id: "sf", label: "SF", category: "상상력" },
  { id: "fantasy", label: "판타지", category: "상상력" },
  { id: "animation", label: "애니메이션", category: "상상력" },
  { id: "horror", label: "공포", category: "상상력" },
  { id: "occult", label: "오컬트", category: "상상력" },

  { id: "documentary", label: "다큐멘터리", category: "현실·시사" },
  { id: "legal", label: "법정", category: "현실·시사" },
  { id: "medical", label: "의학", category: "현실·시사" },
  { id: "political", label: "정치", category: "현실·시사" },

  { id: "historical", label: "사극", category: "시대극" },

  { id: "sports", label: "스포츠", category: "라이프스타일" },
  { id: "teen", label: "하이틴", category: "라이프스타일" },
  { id: "music", label: "음악", category: "라이프스타일" },
  { id: "cooking", label: "요리", category: "라이프스타일" },
  { id: "survival", label: "서바이벌", category: "라이프스타일" },
  { id: "reality", label: "리얼리티", category: "라이프스타일" },
];
