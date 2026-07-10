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

const COURSE_CACHE_KEY = "playting_courses_cache";
// Gemini's free tier caps out at a small number of requests per day, shared
// across every visitor hitting this one deployment — regenerating on every
// single home visit (as opposed to every distinct *session*) burns through
// that budget almost immediately at a booth with real foot traffic. Reusing
// the last result for a few minutes keeps "feels fresh each visit" without
// spending a Gemini call on every accidental re-render or quick tab switch.
const COURSE_CACHE_TTL_MS = 10 * 60 * 1000;

type CourseCache = {
  key: string;
  generatedAt: number;
  courses: Course[];
};

function readCourseCache(key: string): Course[] | null {
  try {
    const raw = window.localStorage.getItem(COURSE_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as CourseCache;
    if (cache.key !== key || Date.now() - cache.generatedAt > COURSE_CACHE_TTL_MS) return null;
    return cache.courses;
  } catch {
    return null;
  }
}

function writeCourseCache(key: string, courses: Course[]) {
  const cache: CourseCache = { key, generatedAt: Date.now(), courses };
  window.localStorage.setItem(COURSE_CACHE_KEY, JSON.stringify(cache));
}

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
  const [failed, setFailed] = useState(false);
  const [subscribedOttNames, setSubscribedOttNames] = useState<Set<string>>(new Set());
  const [retryToken, setRetryToken] = useState(0);
  const forceRefreshRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const forceRefresh = forceRefreshRef.current;
    forceRefreshRef.current = false;

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

      const cacheKey = JSON.stringify({ genres, people, subscribedOtt });
      const cached = forceRefresh ? null : readCourseCache(cacheKey);
      if (cached) {
        setConfigured(true);
        setFailed(false);
        setCourses(cached);
        return;
      }

      setFailed(false);
      fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genres, people, subscribedOtt }),
      })
        .then((res) => res.json())
        .then((json) => {
          if (cancelled) return;
          setConfigured(Boolean(json.configured));
          setFailed(Boolean(json.error));
          const nextCourses: Course[] = json.courses ?? [];
          setCourses(nextCourses);
          if (!json.error && nextCourses.length > 0) writeCourseCache(cacheKey, nextCourses);
        })
        .catch(() => {
          if (cancelled) return;
          setFailed(true);
          setCourses([]);
        });
    });

    return () => {
      cancelled = true;
    };
    // Every mount (including a soft-nav revisit of "/") should generate a fresh
    // set of courses — `retryToken` also lets the manual retry button below
    // re-run this same effect without duplicating its logic.
  }, [retryToken]);

  if (courses === null) {
    return (
      <div className="flex flex-col gap-3 px-6 pt-8">
        <div className="mx-auto flex items-center gap-2 rounded-full border border-accent-light/40 bg-accent-soft px-4 py-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent-light" />
          <p className="text-xs font-semibold text-accent-light">AI를 사용하여 추천 코스를 생성중이에요!</p>
        </div>
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

  if (courses.length === 0) {
    if (!failed) return null;
    return (
      <div className="mx-6 mt-8 flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-5 text-center">
        <p className="text-xs leading-relaxed text-muted">
          코스를 준비하는 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.
        </p>
        <button
          type="button"
          onClick={() => {
            forceRefreshRef.current = true;
            setCourses(null);
            setRetryToken((t) => t + 1);
          }}
          className="rounded-full border border-accent-light px-4 py-1.5 text-xs font-semibold text-accent-light transition-colors hover:bg-accent-soft"
        >
          다시 시도
        </button>
      </div>
    );
  }

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
