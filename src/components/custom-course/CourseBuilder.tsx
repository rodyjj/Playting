"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Cinzel, Song_Myung } from "next/font/google";
import type { TitleDetails, TitleSuggestion } from "@/lib/tmdb";
import CourseModal from "./CourseModal";

const songMyung = Song_Myung({ weight: "400" });
const cinzel = Cinzel({ subsets: ["latin"], weight: ["500", "600"] });

type Tab = "immersion" | "explore";
type OrderState = "idle" | "processing" | "done";

type SavedCourse = {
  id: string;
  mainDish: TitleSuggestion;
  mainDishDetails: TitleDetails | null;
  includeAppetizer: boolean;
  includeDessert: boolean;
};

const MAX_SAVED_COURSES = 3;

function ToggleButton({ included, onClick }: { included: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
        included ? "bg-accent-light text-white" : "bg-surface-elevated text-muted"
      }`}
    >
      {included ? "보기" : "제외"}
    </button>
  );
}

export default function CourseBuilder() {
  const [activeTab, setActiveTab] = useState<Tab>("immersion");
  const [includeAppetizer, setIncludeAppetizer] = useState(true);
  const [includeDessert, setIncludeDessert] = useState(true);

  const [mainDishQuery, setMainDishQuery] = useState("");
  const [mainDishSelected, setMainDishSelected] = useState<TitleSuggestion | null>(null);
  const [mainDishDetails, setMainDishDetails] = useState<TitleDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<TitleSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [orderState, setOrderState] = useState<OrderState>("idle");
  const [savedCourses, setSavedCourses] = useState<SavedCourse[]>([]);
  const [activeModalCourse, setActiveModalCourse] = useState<SavedCourse | null>(null);
  const [hoveredSuggestion, setHoveredSuggestion] = useState<TitleSuggestion | null>(null);
  const cursorTooltipRef = useRef<HTMLDivElement>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  // Kept fresh so the 1.2s "processing" wait in handleSubmit can snapshot whatever
  // the user last saw, even if a toggle or the details fetch changes mid-wait.
  const mainDishDetailsRef = useRef(mainDishDetails);
  const includeAppetizerRef = useRef(includeAppetizer);
  const includeDessertRef = useRef(includeDessert);
  useEffect(() => {
    mainDishDetailsRef.current = mainDishDetails;
  }, [mainDishDetails]);
  useEffect(() => {
    includeAppetizerRef.current = includeAppetizer;
  }, [includeAppetizer]);
  useEffect(() => {
    includeDessertRef.current = includeDessert;
  }, [includeDessert]);

  const trackCursor = (e: React.MouseEvent) => {
    const el = cursorTooltipRef.current;
    if (!el) return;
    el.style.left = `${e.clientX}px`;
    el.style.top = `${e.clientY}px`;
  };

  useEffect(() => {
    if (mainDishSelected) return;

    const query = mainDishQuery.trim();
    const controller = new AbortController();

    const timer = setTimeout(() => {
      if (query.length === 0) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }
      fetch(`/api/titles?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((json) => {
          setSuggestions(json.results ?? []);
          setShowDropdown(true);
        })
        .catch(() => {});
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [mainDishQuery, mainDishSelected]);

  // Closes the dropdown on an outside click/tap without touching the typed query,
  // so focusing the input again can simply reopen it against the cached suggestions.
  useEffect(() => {
    if (!showDropdown) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!searchWrapperRef.current?.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [showDropdown]);

  const selectSuggestion = (suggestion: TitleSuggestion) => {
    setMainDishSelected(suggestion);
    setMainDishQuery(suggestion.year ? `${suggestion.title} (${suggestion.year})` : suggestion.title);
    setShowDropdown(false);
    setOrderState("idle");
    setHoveredSuggestion(null);

    setMainDishDetails(null);
    setDetailsLoading(true);
    fetch(`/api/title-details?id=${suggestion.id}&mediaType=${suggestion.mediaType}`)
      .then((res) => res.json())
      .then((json) => setMainDishDetails(json))
      .catch(() => setMainDishDetails(null))
      .finally(() => setDetailsLoading(false));
  };

  const handleSubmit = () => {
    if (!mainDishSelected || orderState === "processing") return;
    setOrderState("processing");
    const dish = mainDishSelected;
    // Placeholder for the real AI course-composition call — simulates the wait
    // until that endpoint exists, then reveals the summary and re-arms the button.
    window.setTimeout(() => {
      setOrderState("done");
      const newCourse: SavedCourse = {
        id: `${dish.id}-${dish.mediaType}-${Date.now()}`,
        mainDish: dish,
        mainDishDetails: mainDishDetailsRef.current,
        includeAppetizer: includeAppetizerRef.current,
        includeDessert: includeDessertRef.current,
      };
      // Newest first, capped so clearing the search input later can never lose it —
      // a saved course is a snapshot, independent of the live filter state.
      setSavedCourses((prev) => [newCourse, ...prev].slice(0, MAX_SAVED_COURSES));
      setActiveModalCourse(newCourse);
    }, 1200);
  };

  return (
    <div className="mt-6">
      <h2 className="mx-6 text-lg font-bold text-foreground">나만의 코스 짜기</h2>

      <div className="mx-6 mt-3 overflow-hidden rounded-3xl border border-border bg-surface">
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab("immersion")}
            className={`flex-1 border-b-2 py-3 text-sm font-bold transition-colors ${
              activeTab === "immersion"
                ? "border-accent-light text-foreground"
                : "border-transparent text-muted"
            }`}
          >
            몰입 코스
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("explore")}
            className={`flex-1 border-b-2 py-3 text-sm font-bold transition-colors ${
              activeTab === "explore" ? "border-accent-light text-foreground" : "border-transparent text-muted"
            }`}
          >
            탐험 코스
          </button>
        </div>

        <div className="p-5">
          {activeTab === "immersion" && (
            <div className="flex flex-col gap-4">
              <div className="overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-b from-[#1c1410] to-[#0c0906] px-5 py-4">
                <p className={`${cinzel.className} text-center text-2xl tracking-[0.3em] text-amber-300`}>MENU</p>
                <p
                  className={`${cinzel.className} mt-1 text-center text-[10px] tracking-[0.4em] text-amber-400/70`}
                >
                  PLAYTING &amp; TASTING
                </p>
                <div className="mx-auto mt-3 h-px w-14 bg-amber-500/40" />

                <div className="mt-4 flex flex-col gap-3">
                  <div>
                    <p
                      className={`${songMyung.className} text-lg ${
                        includeAppetizer ? "text-amber-100" : "text-amber-100/30 line-through"
                      }`}
                    >
                      에피타이저
                    </p>
                    <p
                      className={`mt-0.5 pl-4 font-sans text-xs italic ${
                        includeAppetizer ? "text-amber-200/60" : "text-amber-200/25"
                      }`}
                    >
                      선택하신 영화의 PV 혹은 예고편이 제공됩니다.
                    </p>
                  </div>

                  <div>
                    <p className={`${songMyung.className} text-lg text-amber-100`}>메인디쉬</p>
                    <div className="mt-2 flex gap-3">
                      {mainDishSelected?.posterUrl ? (
                        <div className="relative aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-md border border-amber-500/40">
                          <Image
                            src={mainDishSelected.posterUrl}
                            alt={mainDishSelected.title}
                            fill
                            sizes="112px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="aspect-[2/3] w-28 shrink-0 rounded-md border border-dashed border-amber-500/30" />
                      )}
                      <div className="min-w-0 flex-1">
                        {mainDishSelected ? (
                          <div className="font-sans text-xs leading-relaxed text-amber-200/80">
                            <p className="line-clamp-1">
                              {mainDishSelected.title}
                              {mainDishSelected.year ? ` · ${mainDishSelected.year}` : ""}
                            </p>
                            {detailsLoading ? (
                              <p className="text-amber-200/50">정보를 불러오는 중&hellip;</p>
                            ) : (
                              <>
                                <p className="line-clamp-1">감독 {mainDishDetails?.director ?? "정보 없음"}</p>
                                <p className="line-clamp-1">
                                  출연{" "}
                                  {mainDishDetails?.cast.length ? mainDishDetails.cast.join(", ") : "정보 없음"}
                                </p>
                                <p>{mainDishDetails?.ottName ?? "제공 플랫폼 확인 중"}</p>
                              </>
                            )}
                          </div>
                        ) : (
                          <p className="font-sans text-[11px] text-amber-200/50">메인디쉬를 선택해주세요</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <p
                    className={`${songMyung.className} text-lg ${
                      includeDessert ? "text-amber-100" : "text-amber-100/30 line-through"
                    }`}
                  >
                    디저트
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">에피타이저</span>
                <ToggleButton included={includeAppetizer} onClick={() => setIncludeAppetizer((v) => !v)} />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-foreground">
                  메인디쉬 <span className="text-accent-light">*필수</span>
                </span>

                <div ref={searchWrapperRef} className="relative">
                  <input
                    value={mainDishQuery}
                    onChange={(e) => {
                      setMainDishQuery(e.target.value);
                      if (mainDishSelected) {
                        setMainDishSelected(null);
                        setMainDishDetails(null);
                        setOrderState("idle");
                      }
                    }}
                    onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                    placeholder="작품 제목을 검색해보세요"
                    className={`w-full rounded-xl border px-3 py-2 text-sm text-foreground outline-none focus:border-accent-light ${
                      mainDishSelected ? "border-accent-light bg-accent-soft" : "border-border bg-background"
                    }`}
                  />
                  {showDropdown && suggestions.length > 0 && (
                    <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-lg">
                      {suggestions.map((s) => (
                        <li key={`${s.title}-${s.year}-${s.mediaType}`}>
                          <button
                            type="button"
                            onClick={() => selectSuggestion(s)}
                            onMouseEnter={(e) => {
                              setHoveredSuggestion(s);
                              trackCursor(e);
                            }}
                            onMouseMove={trackCursor}
                            onMouseLeave={() => setHoveredSuggestion(null)}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-foreground hover:bg-accent-soft"
                          >
                            <span className="line-clamp-1">{s.title}</span>
                            <span className="shrink-0 pl-2 text-xs text-muted">
                              {s.year ?? ""} {s.mediaType === "movie" ? "영화" : "시리즈"}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">디저트</span>
                <ToggleButton included={includeDessert} onClick={() => setIncludeDessert((v) => !v)} />
              </div>

              <button
                type="button"
                disabled={orderState === "processing"}
                onClick={handleSubmit}
                className={`mt-1 w-full rounded-xl py-3 text-sm font-bold transition-colors ${
                  orderState === "processing"
                    ? "cursor-not-allowed bg-surface-elevated text-muted"
                    : "bg-accent-light text-white"
                }`}
              >
                {orderState === "processing" ? "주문완료" : orderState === "done" ? "재주문하기" : "주문하기"}
              </button>

              {orderState === "processing" && (
                <p className="text-center text-xs text-muted">코스를 준비하고 있어요&hellip;</p>
              )}
            </div>
          )}

          {activeTab === "explore" && (
            <p className="py-8 text-center text-sm text-muted">준비 중이에요</p>
          )}
        </div>
      </div>

      {/* Clearly separated from the filter box above — these are saved snapshots,
          independent of whatever's currently in the search box (up to 3, newest first). */}
      {savedCourses.length > 0 && (
        <div className="mx-6 mt-10">
          <h3 className="text-base font-bold text-foreground">🎯 맞춤 코스를 생성해 드렸어요!</h3>
          <div className="mt-3 flex flex-col gap-2">
            {savedCourses.map((course) => (
              <button
                key={course.id}
                type="button"
                onClick={() => setActiveModalCourse(course)}
                className="flex items-center justify-between rounded-xl border border-border bg-surface-elevated px-4 py-3 text-left"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-foreground">
                    {course.mainDish.title} 감상 코스
                  </span>
                  <span className="block text-xs text-muted">눌러서 코스 메뉴를 확인하세요</span>
                </span>
                <span className="shrink-0 pl-3 text-lg text-muted">›</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Follows the cursor while hovering a suggestion; the ref stays attached across
          hover changes so position updates never race a re-mount. */}
      <div ref={cursorTooltipRef} className="pointer-events-none fixed z-50 -translate-x-1/2 pt-3">
        {hoveredSuggestion?.posterUrl && (
          <div className="relative aspect-[2/3] w-44 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
            <Image
              src={hoveredSuggestion.posterUrl}
              alt={hoveredSuggestion.title}
              fill
              sizes="176px"
              className="object-cover"
            />
          </div>
        )}
      </div>

      {activeModalCourse && (
        <CourseModal
          mainDish={activeModalCourse.mainDish}
          mainDishDetails={activeModalCourse.mainDishDetails}
          includeAppetizer={activeModalCourse.includeAppetizer}
          includeDessert={activeModalCourse.includeDessert}
          onClose={() => setActiveModalCourse(null)}
        />
      )}
    </div>
  );
}
