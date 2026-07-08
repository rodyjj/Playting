"use client";

import { useState } from "react";

const SUB_TABS = [
  { key: "best", emoji: "🏆", label: "인생작", empty: "좋아요를 누른 콘텐츠가 이곳에 모여요." },
  { key: "watchlist", emoji: "⭐", label: "볼거에요", empty: "나중에 보고 싶은 콘텐츠를 찜해보세요." },
  { key: "watched", emoji: "👀", label: "봤어요", empty: "외부 OTT로 이동해서 본 콘텐츠 기록이 쌓여요." },
] as const;

export default function RecipeTabs() {
  const [active, setActive] = useState<(typeof SUB_TABS)[number]["key"]>("best");
  const current = SUB_TABS.find((tab) => tab.key === active) ?? SUB_TABS[0];

  return (
    <div className="flex flex-col">
      <div className="flex gap-2 px-6 pt-2">
        {SUB_TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={`flex-1 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                isActive
                  ? "border-accent-light bg-accent-soft text-accent-light"
                  : "border-border bg-surface text-muted"
              }`}
            >
              {tab.emoji} {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3 px-8 text-center">
        <span className="text-4xl">{current.emoji}</span>
        <p className="text-sm leading-relaxed text-muted">{current.empty}</p>
      </div>
    </div>
  );
}
