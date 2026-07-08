"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { fetchOnboardingData } from "@/lib/onboarding";
import { OTT_PROVIDERS } from "@/data/ott-providers";

type CourseItem = {
  title: string;
  ott: string;
  year: number;
  posterUrl: string;
};

type Course = {
  title: string;
  emoji: string;
  theme: string;
  items: CourseItem[];
};

function ottColor(ott: string) {
  return OTT_PROVIDERS.find((p) => p.name === ott)?.color ?? "#2D437A";
}

/**
 * Native touch scrolling already works without help; mouse users have no way
 * to drag a horizontal row, so pointer events add click-and-drag scrolling
 * only for mouse input (touch/pen pointers fall through to native scroll).
 */
function CourseRow({
  items,
  subscribedOttNames = new Set(),
}: {
  items: CourseItem[];
  subscribedOttNames?: Set<string>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startScrollLeft: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = { startX: event.clientX, startScrollLeft: el.scrollLeft, moved: false };
    setDragging(true);
    el.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    const state = dragState.current;
    if (!el || !state) return;
    const delta = event.clientX - state.startX;
    if (Math.abs(delta) > 3) state.moved = true;
    el.scrollLeft = state.startScrollLeft - delta;
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (el && dragState.current) {
      if (dragState.current.moved) {
        // Prevent the trailing click from firing after a real drag.
        event.preventDefault();
      }
      el.releasePointerCapture(event.pointerId);
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
        if (dragState.current?.moved) event.stopPropagation();
      }}
      className={`mt-3 flex gap-3 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
        dragging ? "cursor-grabbing select-none" : "cursor-grab"
      }`}
    >
      {items.map((item) => (
        <div key={item.title} className="w-32 shrink-0">
          <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-border bg-surface">
            <Image
              src={item.posterUrl}
              alt={item.title}
              fill
              sizes="128px"
              className="pointer-events-none object-cover select-none"
              draggable={false}
            />
            {!subscribedOttNames.has(item.ott) && (
              <div className="absolute inset-x-0 top-0 bg-black/60 px-1.5 py-1 backdrop-blur-[1px]">
                <p className="text-center text-[8px] font-semibold leading-tight text-white/95">
                  미구독 플랫폼 컨텐츠입니다.
                </p>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent px-2 pb-2 pt-6">
              <span
                className="inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white"
                style={{ backgroundColor: ottColor(item.ott) }}
              >
                {item.ott}
              </span>
            </div>
          </div>
          <p className="mt-1.5 line-clamp-1 text-xs font-medium text-foreground">{item.title}</p>
        </div>
      ))}
    </div>
  );
}

export default function CourseList() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [configured, setConfigured] = useState(true);
  const [subscribedOttNames, setSubscribedOttNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    fetchOnboardingData().then((data) => {
      if (cancelled) return;

      const genres = data?.preferredGenres ?? [];
      const people = data?.preferredPeople ?? [];
      const subscribedOtt = data?.subscribedOtt ?? [];

      setSubscribedOttNames(
        new Set(
          subscribedOtt
            .map((id) => OTT_PROVIDERS.find((p) => p.id === id)?.name)
            .filter((name): name is string => Boolean(name))
        )
      );

      if (genres.length === 0 && people.length === 0) {
        setCourses([]);
        return;
      }

      fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genres, people, subscribedOtt }),
      })
        .then((res) => res.json())
        .then((json) => {
          if (cancelled) return;
          setConfigured(Boolean(json.configured));
          setCourses(json.courses ?? []);
        })
        .catch(() => {
          if (!cancelled) setCourses([]);
        });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (courses === null) {
    return (
      <div className="flex flex-col gap-3 px-6 pt-8">
        <div className="h-5 w-40 animate-pulse rounded-full bg-surface" />
        <div className="flex gap-3">
          <div className="h-48 w-32 shrink-0 animate-pulse rounded-2xl bg-surface" />
          <div className="h-48 w-32 shrink-0 animate-pulse rounded-2xl bg-surface" />
          <div className="h-48 w-32 shrink-0 animate-pulse rounded-2xl bg-surface" />
        </div>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="mx-6 mt-8 rounded-2xl border border-border bg-surface p-4 text-xs leading-relaxed text-muted">
        AI 코스 추천을 사용하려면 Gemini API 키가 필요해요. <code className="text-foreground">.env.local</code>에{" "}
        <code className="text-foreground">GEMINI_API_KEY</code>를 설정해주세요.
      </div>
    );
  }

  if (courses.length === 0) return null;

  return (
    <div className="flex flex-col gap-8 pt-8">
      {courses.map((course) => (
        <section key={course.title}>
          <div className="flex items-baseline gap-2 px-6">
            <h2 className="text-lg font-bold text-foreground">
              {course.emoji} {course.title}
            </h2>
            <span className="text-xs font-medium text-accent-light">{course.theme}</span>
          </div>
          <CourseRow items={course.items} subscribedOttNames={subscribedOttNames} />
        </section>
      ))}
    </div>
  );
}
