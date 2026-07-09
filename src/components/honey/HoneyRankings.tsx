"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { OTT_PROVIDERS } from "@/data/ott-providers";

type RankingItem = {
  rank: number;
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  year?: number;
  posterUrl: string;
  ott: string;
  watchUrl: string;
};

type RankingSection = {
  label: string;
  items: RankingItem[];
};

type TabState = {
  sections: RankingSection[];
  unsupported: boolean;
  weekOf?: string | null;
};

const TABS = [{ id: "all", name: "꿀맛 랭킹", color: "#4C6BB0", iconUrl: "/table/honey.png" }].concat(
  OTT_PROVIDERS.map((p) => ({ id: p.id, name: `${p.name} 랭킹`, color: p.color, iconUrl: p.iconUrl }))
);

function ottColor(ott: string) {
  return OTT_PROVIDERS.find((p) => p.name === ott)?.color ?? "#2D437A";
}

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const value = parseInt(clean, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function RankingRow({ item }: { item: RankingItem }) {
  return (
    <li>
      <a
        href={item.watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${item.title} — ${item.ott}에서 보기`}
        className="flex items-center gap-3"
      >
        <span
          className={`w-6 shrink-0 text-center text-lg font-extrabold ${
            item.rank <= 3 ? "text-accent-light" : "text-muted"
          }`}
        >
          {item.rank}
        </span>
        <div className="relative h-[84px] w-[58px] shrink-0 overflow-hidden rounded-xl border border-border bg-surface">
          <Image src={item.posterUrl} alt={item.title} fill sizes="58px" className="object-cover" />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="line-clamp-2 text-sm font-semibold text-foreground">{item.title}</p>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
              style={{ backgroundColor: ottColor(item.ott) }}
            >
              {item.ott}
            </span>
            {item.year && <span className="text-[11px] text-muted">{item.year}</span>}
          </div>
        </div>
      </a>
    </li>
  );
}

export default function HoneyRankings() {
  const [activeTab, setActiveTab] = useState("all");
  const [configured, setConfigured] = useState(true);
  const [cache, setCache] = useState<Record<string, TabState>>({});

  useEffect(() => {
    if (cache[activeTab]) return;
    let cancelled = false;
    fetch(`/api/rankings?platform=${activeTab}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setConfigured(Boolean(data.configured));
        setCache((prev) => ({
          ...prev,
          [activeTab]: {
            sections: data.sections ?? [],
            unsupported: Boolean(data.unsupported),
            weekOf: data.weekOf ?? null,
          },
        }));
      })
      .catch(() => {
        if (cancelled) return;
        setCache((prev) => ({ ...prev, [activeTab]: { sections: [], unsupported: false } }));
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, cache]);

  const state = cache[activeTab];
  const totalItems = state?.sections?.reduce((sum, s) => sum + s.items.length, 0) ?? 0;

  const tabsRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; scrollLeft: number; pointerId: number; captured: boolean } | null>(null);
  const movedRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Mouse only — touch already gets native swipe-scroll from overflow-x-auto,
    // and hijacking it here would fight the browser's own touch scrolling.
    if (e.pointerType !== "mouse") return;
    const el = tabsRef.current;
    if (!el) return;
    dragRef.current = { startX: e.clientX, scrollLeft: el.scrollLeft, pointerId: e.pointerId, captured: false };
    movedRef.current = false;
    // Pointer capture is deliberately NOT taken here on plain pointerdown —
    // capturing on the container immediately breaks the browser's own click
    // synthesis for the child <button> underneath the pointer, so a plain tap
    // stopped registering as a click. It's only engaged once we confirm an
    // actual drag (see handlePointerMove), so ordinary taps stay unaffected.
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const el = tabsRef.current;
    const drag = dragRef.current;
    if (!el || !drag) return;
    const delta = e.clientX - drag.startX;
    if (!drag.captured && Math.abs(delta) > 5) {
      drag.captured = true;
      try {
        el.setPointerCapture(drag.pointerId);
      } catch {}
    }
    if (Math.abs(delta) > 5) movedRef.current = true;
    el.scrollLeft = drag.scrollLeft - delta;
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="flex flex-col">
      <div
        ref={tabsRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="flex cursor-grab gap-2 overflow-x-auto px-6 pt-2 pb-3 select-none active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              draggable={false}
              onClick={() => {
                if (movedRef.current) return;
                setActiveTab(tab.id);
              }}
              style={
                isActive
                  ? {
                      borderColor: hexToRgba(tab.color, 0.6),
                      background: `linear-gradient(135deg, ${hexToRgba(tab.color, 0.2)}, var(--accent-soft))`,
                      boxShadow: `0 3px 12px -3px ${hexToRgba(tab.color, 0.5)}`,
                    }
                  : undefined
              }
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                isActive ? "scale-[1.03] text-foreground" : "border-border/70 bg-surface/70 text-muted"
              }`}
            >
              <span
                className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full"
                style={{ boxShadow: `0 0 0 1.5px ${hexToRgba(tab.color, isActive ? 0.95 : 0.4)}` }}
              >
                <Image src={tab.iconUrl} alt="" fill sizes="28px" className="object-cover" draggable={false} />
              </span>
              {tab.name}
            </button>
          );
        })}
      </div>

      {activeTab === "netflix" && state?.weekOf && (
        <p className="px-6 pb-3 text-[11px] text-muted">Netflix 공식 발표 기준 · {state.weekOf} 주간</p>
      )}

      {!configured ? (
        <div className="mx-6 rounded-2xl border border-border bg-surface p-4 text-xs leading-relaxed text-muted">
          랭킹을 불러오려면 TMDB API 키가 필요해요. <code className="text-foreground">.env.local</code>에{" "}
          <code className="text-foreground">TMDB_API_KEY</code>를 설정해주세요.
        </div>
      ) : !state ? (
        <div className="flex flex-col gap-3 px-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-6 w-6 shrink-0 animate-pulse rounded bg-surface" />
              <div className="h-[84px] w-[58px] shrink-0 animate-pulse rounded-xl bg-surface" />
              <div className="h-4 flex-1 animate-pulse rounded bg-surface" />
            </div>
          ))}
        </div>
      ) : state.unsupported ? (
        <div className="flex flex-col items-center justify-center gap-3 px-8 py-16 text-center">
          <span className="text-4xl">🍯</span>
          <p className="text-sm leading-relaxed text-muted">
            {"아직 이 플랫폼의 실시간 랭킹을 제공하는\n공개 API가 없어요. 곧 다른 방법으로 지원할게요."}
          </p>
        </div>
      ) : totalItems === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-8 py-16 text-center">
          <span className="text-4xl">🍯</span>
          <p className="text-sm leading-relaxed text-muted">랭킹 데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 pb-8">
          {state.sections.map(
            (section, i) =>
              section.items.length > 0 && (
                <div key={i} className="flex flex-col gap-4">
                  {section.label && <h2 className="px-6 text-sm font-bold text-foreground">{section.label}</h2>}
                  <ul className="flex flex-col gap-4 px-6">
                    {section.items.map((item) => (
                      <RankingRow key={`${item.mediaType}-${item.id}`} item={item} />
                    ))}
                  </ul>
                </div>
              )
          )}
        </div>
      )}
    </div>
  );
}
