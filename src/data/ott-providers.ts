export type OttProvider = {
  id: string;
  name: string;
  color: string;
  iconUrl: string;
};

export const OTT_PROVIDERS: OttProvider[] = [
  { id: "netflix", name: "넷플릭스", color: "#E50914", iconUrl: "/ott/netflix.png" },
  { id: "disney-plus", name: "디즈니+", color: "#113CCF", iconUrl: "/ott/disney-plus.png" },
  { id: "coupang-play", name: "쿠팡플레이", color: "#3861FB", iconUrl: "/ott/coupang-play.png" },
  { id: "apple-tv", name: "Apple TV", color: "#A3AAAE", iconUrl: "/ott/apple-tv.png" },
  { id: "tving", name: "티빙", color: "#FF1A46", iconUrl: "/ott/tving.png" },
  { id: "watcha", name: "왓챠", color: "#FF0558", iconUrl: "/ott/watcha.png" },
  { id: "wavve", name: "웨이브", color: "#1E1E4B", iconUrl: "/ott/wavve.png" },
  { id: "laftel", name: "라프텔", color: "#4C2CE5", iconUrl: "/ott/laftel.png" },
  { id: "prime-video", name: "프라임비디오", color: "#1FA8DC", iconUrl: "/ott/prime-video.png" },
  { id: "cineforce", name: "씨네폭스", color: "#F5A623", iconUrl: "/ott/cineforce.png" },
];
