"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { OTT_PROVIDERS } from "@/data/ott-providers";
import type { RelatedGroup, RelatedTitle, SearchMainTitle } from "@/lib/tmdb";
import FavoriteButton from "@/components/common/FavoriteButton";

function ottColor(ott: string) {
  return OTT_PROVIDERS.find((p) => p.name === ott)?.color ?? "#2D437A";
}

/**
 * Native touch scrolling already works without help; mouse users have no way
 * to drag a horizontal row, so pointer events add click-and-drag scrolling
 * only for mouse input (touch/pen pointers fall through to native scroll).
 * Same pattern as CourseList's CourseRow.
 */
function RelatedRow({ items }: { items: RelatedTitle[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startScrollLeft: number; moved: boolean; captured: boolean } | null>(
    null
  );
  const [dragging, setDragging] = useState(false);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = { startX: event.clientX, startScrollLeft: el.scrollLeft, moved: false, captured: false };
    setDragging(true);
    // Pointer capture is deliberately NOT taken here on plain pointerdown —
    // capturing on the container immediately breaks the browser's own click
    // synthesis for a child <button> underneath the pointer (e.g. the
    // favorite star), so a plain tap/click stopped registering. It's only
    // engaged once a real drag is confirmed in handlePointerMove.
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    const state = dragState.current;
    if (!el || !state) return;
    const delta = event.clientX - state.startX;
    if (!state.captured && Math.abs(delta) > 3) {
      state.captured = true;
      try {
        el.setPointerCapture(event.pointerId);
      } catch {}
    }
    if (Math.abs(delta) > 3) state.moved = true;
    el.scrollLeft = state.startScrollLeft - delta;
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (el && dragState.current) {
      if (dragState.current.moved) event.preventDefault();
      if (dragState.current.captured) el.releasePointerCapture(event.pointerId);
    }
    dragState.current = null;
    setDragging(false);
  };

  return (
    <div
      ref={scrollRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onClickCapture={(event) => {
        if (dragState.current?.moved) event.preventDefault();
      }}
      className={`flex gap-3 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
        dragging ? "cursor-grabbing select-none" : "cursor-grab"
      }`}
    >
      {items.map((item) => (
        <a
          key={`${item.mediaType}-${item.id}`}
          href={item.watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${item.title} — ${item.ott}에서 보기`}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          className="w-32 shrink-0"
        >
          <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-border bg-surface">
            {item.posterUrl && (
              <Image
                src={item.posterUrl}
                alt={item.title}
                fill
                sizes="128px"
                className="pointer-events-none object-cover select-none"
                draggable={false}
              />
            )}
            <FavoriteButton id={`${item.mediaType}-${item.id}`} />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent px-2 pb-2 pt-6">
              <span
                className="inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white"
                style={{ backgroundColor: ottColor(item.ott) }}
              >
                {item.ott}
              </span>
            </div>
          </div>
          <p className="mt-1.5 line-clamp-2 text-xs font-medium text-foreground">{item.title}</p>
          {item.year && <p className="text-[11px] text-muted">{item.year}</p>}
        </a>
      ))}
    </div>
  );
}

function MainTitleCard({ main }: { main: SearchMainTitle }) {
  return (
    <div className="flex gap-4 px-6 pt-8">
      {main.posterUrl && (
        <div className="relative aspect-[2/3] w-32 shrink-0 overflow-hidden rounded-2xl border border-border bg-surface">
          <Image src={main.posterUrl} alt={main.title} fill sizes="128px" className="object-cover" />
          <FavoriteButton id={`${main.mediaType}-${main.id}`} />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-col gap-1.5">
          <p className="text-lg font-bold text-foreground">
            {main.title}
            {main.year ? ` (${main.year})` : ""}
          </p>
          <p className="text-xs leading-relaxed text-muted">감독/제작 {main.director ?? "정보 없음"}</p>
          <p className="text-xs leading-relaxed text-muted">
            출연 {main.cast.length ? main.cast.join(", ") : "정보 없음"}
          </p>
          {main.ottName && (
            <span
              className="mt-1 inline-block w-fit rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
              style={{ backgroundColor: ottColor(main.ottName) }}
            >
              {main.ottName}
            </span>
          )}
        </div>
        {/* Pinned to the bottom of the stretched flex column so it lines up
            with the poster's bottom edge regardless of how much text is above. */}
        {main.watchUrl ? (
          <a
            href={main.watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto block rounded-xl bg-accent-light py-2.5 text-center text-sm font-bold text-white"
          >
            시청하기
          </a>
        ) : (
          <p className="mt-auto text-xs text-muted">시청 가능한 플랫폼을 찾지 못했어요.</p>
        )}
      </div>
    </div>
  );
}

export default function SearchResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const mediaType = searchParams.get("mediaType") === "movie" ? "movie" : "tv";
  const title = searchParams.get("title") ?? "";

  // Keyed by the id it was fetched for, so a stale previous result never
  // renders under a new id — comparing `result?.id` to the current `id`
  // below derives "still loading" instead of resetting state inside the
  // effect body.
  const [result, setResult] = useState<{
    id: string;
    configured: boolean;
    main: SearchMainTitle | null;
    groups: RelatedGroup[];
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    fetch(`/api/search-page?id=${id}&mediaType=${mediaType}&title=${encodeURIComponent(title)}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setResult({ id, configured: Boolean(json.configured), main: json.data?.main ?? null, groups: json.data?.groups ?? [] });
      })
      .catch(() => {
        if (cancelled) return;
        setResult({ id, configured: true, main: null, groups: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [id, mediaType, title]);

  const isLoading = result?.id !== id;
  const configured = isLoading ? true : result.configured;
  const main = isLoading ? null : result.main;
  const groups = isLoading ? null : result.groups;

  if (!id) {
    return (
      <div className="px-6 pt-8 text-center text-sm text-muted">
        검색할 작품을 홈 화면 검색창에서 먼저 선택해주세요.
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="mx-6 mt-8 rounded-2xl border border-border bg-surface p-4 text-xs leading-relaxed text-muted">
        검색 결과를 불러오려면 TMDB API 키가 필요해요. <code className="text-foreground">.env.local</code>에{" "}
        <code className="text-foreground">TMDB_API_KEY</code>를 설정해주세요.
      </div>
    );
  }

  if (groups === null) {
    return (
      <div className="flex flex-col gap-4 px-6 pt-8">
        <div className="flex gap-4">
          <div className="aspect-[2/3] w-32 shrink-0 animate-pulse rounded-2xl bg-surface" />
          <div className="flex flex-1 flex-col gap-2 pt-1">
            <div className="h-5 w-3/4 animate-pulse rounded-full bg-surface" />
            <div className="h-3 w-1/2 animate-pulse rounded-full bg-surface" />
            <div className="h-3 w-2/3 animate-pulse rounded-full bg-surface" />
          </div>
        </div>
      </div>
    );
  }

  if (!main) {
    return (
      <div className="mx-6 mt-8 flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-5 text-center">
        <p className="text-xs leading-relaxed text-muted">검색 결과를 불러오지 못했어요.</p>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="rounded-full border border-accent-light px-4 py-1.5 text-xs font-semibold text-accent-light"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-8">
      <MainTitleCard main={main} />
      {groups.map((group) => (
        <section key={group.label}>
          <h2 className="px-6 text-sm font-bold text-foreground">{group.label}</h2>
          <div className="mt-3">
            <RelatedRow items={group.items} />
          </div>
        </section>
      ))}
    </div>
  );
}
