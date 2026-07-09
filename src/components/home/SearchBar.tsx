"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { TitleSuggestion } from "@/lib/tmdb";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<TitleSuggestion | null>(null);
  const [suggestions, setSuggestions] = useState<TitleSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [hoveredSuggestion, setHoveredSuggestion] = useState<TitleSuggestion | null>(null);
  const cursorTooltipRef = useRef<HTMLDivElement>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  const trackCursor = (e: React.MouseEvent) => {
    const el = cursorTooltipRef.current;
    if (!el) return;
    el.style.left = `${e.clientX}px`;
    el.style.top = `${e.clientY}px`;
  };

  useEffect(() => {
    if (selected) return;

    const trimmed = query.trim();
    const controller = new AbortController();

    const timer = setTimeout(() => {
      if (trimmed.length === 0) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }
      fetch(`/api/titles?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
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
  }, [query, selected]);

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
    setSelected(suggestion);
    setQuery(suggestion.year ? `${suggestion.title} (${suggestion.year})` : suggestion.title);
    setShowDropdown(false);
    setHoveredSuggestion(null);
  };

  return (
    <div className="px-6 pt-5">
      <div ref={searchWrapperRef} className="relative">
        <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-4 py-3.5">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (selected) setSelected(null);
            }}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            placeholder="작품, 배우, 감독을 검색해보세요"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
          />
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
        </div>

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
    </div>
  );
}
