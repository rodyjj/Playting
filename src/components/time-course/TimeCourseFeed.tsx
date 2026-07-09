"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { fetchOnboardingData } from "@/lib/onboarding";
import { BAND_META, TIME_BANDS, type TimeBand } from "@/lib/time-bands";

type VideoItem = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  durationSeconds: number;
  workTitle: string;
  workYear?: number;
};

type TabState = {
  configured: boolean;
  resolvedBand: TimeBand | "mixed";
  items: VideoItem[];
  quietHours: boolean;
};

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function TimeCourseFeed() {
  const [selectedBand, setSelectedBand] = useState<TimeBand | "auto">("auto");
  const [currentRealBand, setCurrentRealBand] = useState<TimeBand | null>(null);
  const [genres, setGenres] = useState<string[] | null>(null);
  const [cache, setCache] = useState<Record<string, TabState>>({});

  useEffect(() => {
    let cancelled = false;
    fetchOnboardingData().then((data) => {
      if (!cancelled) setGenres(data?.preferredGenres ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (genres === null) return; // wait for onboarding prefs so the fetch (and its cache key) is stable
    if (cache[selectedBand]) return;

    let cancelled = false;
    const params = new URLSearchParams({ band: selectedBand, genres: genres.join(",") });
    fetch(`/api/time-course?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setCurrentRealBand(data.currentRealBand ?? null);
        setCache((prev) => ({
          ...prev,
          [selectedBand]: {
            configured: Boolean(data.configured),
            resolvedBand: data.resolvedBand ?? "mixed",
            items: data.items ?? [],
            quietHours: Boolean(data.quietHours),
          },
        }));
      })
      .catch(() => {
        if (cancelled) return;
        setCache((prev) => ({
          ...prev,
          [selectedBand]: { configured: true, resolvedBand: "mixed", items: [], quietHours: false },
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [selectedBand, genres, cache]);

  const state = cache[selectedBand];
  const activeBand = selectedBand === "auto" ? currentRealBand : selectedBand;
  const isPreviewing = selectedBand !== "auto";

  return (
    <div className="flex flex-col gap-4 px-6 pb-8 pt-2">
      <div className="rounded-2xl border border-border bg-surface p-4 text-xs leading-relaxed text-muted">
        <p className="font-semibold text-foreground">시간대에 따라 추천 영상이 달라져요</p>
        <ul className="mt-2 flex flex-col gap-1">
          {TIME_BANDS.map((band) => (
            <li key={band}>
              <span className="font-medium text-foreground">{BAND_META[band].label}</span>({BAND_META[band].timeLabel})
              엔 <span className="text-foreground">{BAND_META[band].videoStyle}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="whitespace-pre-line text-sm text-muted">
          {currentRealBand ? (
            <>
              지금은 <span className="font-semibold text-accent-light">{BAND_META[currentRealBand].label}</span>{" "}
              시간대예요
            </>
          ) : (
            "지금은 큐레이션 시간대가 아니에요\n숏폼·요약·정주행 영상을 섞어서 보여드려요"
          )}
        </p>
        {isPreviewing && (
          <button
            type="button"
            onClick={() => setSelectedBand("auto")}
            className="self-start text-xs font-medium text-accent-light underline-offset-2 hover:underline"
          >
            지금 시간대로 보기
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {TIME_BANDS.map((band) => {
          const isActive = activeBand === band;
          return (
            <button
              key={band}
              type="button"
              onClick={() => setSelectedBand(band)}
              className={`flex-1 rounded-2xl border px-2 py-3 text-center transition-colors ${
                isActive ? "border-accent-light bg-accent-soft text-accent-light" : "border-border bg-surface text-muted"
              }`}
            >
              <span className="block text-sm font-bold">{BAND_META[band].label}</span>
              <span className="mt-1 block text-[10px] opacity-70">{BAND_META[band].timeLabel}</span>
              <span className="block text-[10px] opacity-70">{BAND_META[band].videoStyle}</span>
            </button>
          );
        })}
      </div>

      {!state ? (
        <div className="flex flex-col gap-3 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-20 w-32 shrink-0 animate-pulse rounded-xl bg-surface" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 w-3/4 animate-pulse rounded bg-surface" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-surface" />
              </div>
            </div>
          ))}
        </div>
      ) : !state.configured ? (
        <div className="rounded-2xl border border-border bg-surface p-4 text-xs leading-relaxed text-muted">
          타임코스를 불러오려면 <code className="text-foreground">YOUTUBE_API_KEY</code>와{" "}
          <code className="text-foreground">GEMINI_API_KEY</code>가 모두 필요해요.
        </div>
      ) : state.quietHours ? (
        <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
          <span className="text-4xl">🌙</span>
          <p className="text-sm leading-relaxed text-muted">
            {"지금은 조용한 시간대라 추천을 쉬고 있어요.\n조금 있다 다시 찾아와주세요!"}
          </p>
        </div>
      ) : state.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
          <span className="text-4xl">⏰</span>
          <p className="text-sm leading-relaxed text-muted">영상을 불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {state.items.map((item) => (
            <li key={item.videoId}>
              <a
                href={`https://www.youtube.com/watch?v=${item.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3"
              >
                <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-xl border border-border bg-surface">
                  {item.thumbnailUrl && (
                    <Image src={item.thumbnailUrl} alt={item.title} fill sizes="128px" className="object-cover" />
                  )}
                  <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {formatDuration(item.durationSeconds)}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1 py-0.5">
                  <p className="line-clamp-2 text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted">{item.channelTitle}</p>
                  <span className="mt-auto inline-block w-fit rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent-light">
                    원작 · {item.workTitle}
                    {item.workYear ? ` (${item.workYear})` : ""}
                  </span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
