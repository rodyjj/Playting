"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { PromoTitle } from "@/data/promo-titles";
import { OTT_PROVIDERS } from "@/data/ott-providers";

type ResolvedPromoTitle = PromoTitle & { posterUrl: string };

const ITEM_WIDTH_RATIO = 0.42;
const GAP = 14;
const AUTO_PLAY_MS = 4000;

function ottColor(ott: string) {
  return OTT_PROVIDERS.find((p) => p.name === ott)?.color ?? "#2D437A";
}

export default function PromoCarousel() {
  const [items, setItems] = useState<ResolvedPromoTitle[] | null>(null);
  const [configured, setConfigured] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const dragStartX = useRef<number | null>(null);
  const [dragDeltaX, setDragDeltaX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/posters")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setConfigured(Boolean(data.configured));
        setItems(data.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const itemCount = items?.length ?? 0;

  useEffect(() => {
    if (itemCount <= 1 || isDragging) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % itemCount);
    }, AUTO_PLAY_MS);
    return () => clearInterval(timer);
  }, [itemCount, isDragging]);

  if (items === null || containerWidth === 0) {
    return (
      <div ref={containerRef} className="pt-6">
        <div className="flex px-6">
          <div className="h-[260px] w-[42%] shrink-0 animate-pulse rounded-2xl bg-surface" />
        </div>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="mx-6 mt-6 rounded-2xl border border-border bg-surface p-4 text-xs leading-relaxed text-muted">
        포스터를 자동으로 불러오려면 TMDB API 키가 필요해요. <code className="text-foreground">.env.local</code>에{" "}
        <code className="text-foreground">TMDB_API_KEY</code>를 설정해주세요.
      </div>
    );
  }

  if (itemCount === 0) return null;

  const itemWidth = containerWidth * ITEM_WIDTH_RATIO;
  const itemHeight = itemWidth * 1.5;
  const displayItems = [items[items.length - 1], ...items, items[0]];
  const displayIndex = index + 1;

  const translateX = (containerWidth - itemWidth) / 2 - displayIndex * (itemWidth + GAP);

  const goTo = (next: number) => {
    setIndex(((next % itemCount) + itemCount) % itemCount);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
    setDragDeltaX(0);
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragStartX.current === null) return;
    setDragDeltaX(e.clientX - dragStartX.current);
  };

  const handlePointerUp = () => {
    if (dragStartX.current === null) return;
    const threshold = itemWidth * 0.2;
    if (dragDeltaX <= -threshold) goTo(index + 1);
    else if (dragDeltaX >= threshold) goTo(index - 1);
    dragStartX.current = null;
    setDragDeltaX(0);
    setIsDragging(false);
  };

  return (
    <div className="pt-6">
      <div
        ref={containerRef}
        className="touch-pan-y select-none overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div
          className={`flex ${isDragging ? "" : "transition-transform duration-500 ease-out"}`}
          style={{
            transform: `translateX(${translateX + (isDragging ? dragDeltaX : 0)}px)`,
          }}
        >
          {displayItems.map((item, i) => {
            const isActive = i === displayIndex;
            const isVisible = Math.abs(i - displayIndex) <= 1;
            return (
              <div
                key={`${item.id}-${i}`}
                className="shrink-0"
                style={{ width: itemWidth, marginRight: GAP }}
              >
                <div
                  className={`relative overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-500 ${
                    isActive ? "scale-100 opacity-100" : "scale-[0.92] opacity-50"
                  }`}
                  style={{ height: itemHeight }}
                >
                  <Image
                    src={item.posterUrl}
                    alt={item.title}
                    fill
                    sizes="(max-width: 448px) 45vw, 200px"
                    className="pointer-events-none object-cover select-none"
                    priority={isVisible}
                    draggable={false}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent px-3 pb-2.5 pt-8">
                    <span
                      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                      style={{ backgroundColor: ottColor(item.ott) }}
                    >
                      {item.ott}
                    </span>
                    <p className="mt-1 line-clamp-1 text-xs font-semibold text-white">{item.title}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5">
        {items.map((item, i) => (
          <button
            key={item.id}
            aria-label={`${item.title} 배너로 이동`}
            onClick={() => goTo(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === index ? "w-5 bg-accent-light" : "w-1.5 bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
