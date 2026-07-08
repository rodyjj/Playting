"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Song_Myung } from "next/font/google";
import type { TitleDetails, TitleSuggestion } from "@/lib/tmdb";

const songMyung = Song_Myung({ weight: "400" });

type YoutubeVideo = {
  videoId: string;
  title: string;
  channelTitle: string;
};

type DessertCategory = "true_story" | "complex_lore" | "director_focused" | "music_focused" | "general";

const DESSERT_CATEGORY_LABELS: Record<DessertCategory, string> = {
  true_story: "실화 속 이야기",
  complex_lore: "세계관 정리",
  director_focused: "감독 인터뷰",
  music_focused: "OST",
  general: "비하인드",
};

function VideoEmbed({ video }: { video: YoutubeVideo }) {
  return (
    <div className="mt-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${video.videoId}`}
          title={video.title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <p className="mt-1.5 line-clamp-1 text-xs text-muted">
        {video.title} · {video.channelTitle}
      </p>
    </div>
  );
}

/** Same hand-painted table, plated differently per which courses are included — art assets in public/table/. */
function getTableImage(includeAppetizer: boolean, includeDessert: boolean): string {
  if (includeAppetizer && includeDessert) return "/table/full.png";
  if (includeAppetizer) return "/table/appetizer-only.png";
  if (includeDessert) return "/table/dessert-only.png";
  return "/table/main-only.png";
}

export default function CourseModal({
  mainDish,
  mainDishDetails,
  includeAppetizer,
  includeDessert,
  onClose,
}: {
  mainDish: TitleSuggestion;
  mainDishDetails: TitleDetails | null;
  includeAppetizer: boolean;
  includeDessert: boolean;
  onClose: () => void;
}) {
  const [trailerVideo, setTrailerVideo] = useState<YoutubeVideo | null | undefined>(undefined);
  const [trailerReady, setTrailerReady] = useState(true);
  const [dessertVideos, setDessertVideos] = useState<YoutubeVideo[] | undefined>(undefined);
  const [dessertReady, setDessertReady] = useState(true);
  const [dessertCategory, setDessertCategory] = useState<DessertCategory | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const yearParam = mainDish.year ? String(mainDish.year) : "";

    fetch(`/api/youtube-trailer?title=${encodeURIComponent(mainDish.title)}&year=${yearParam}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((json) => {
        setTrailerVideo(json.video ?? null);
        setTrailerReady(Boolean(json.ready));
      })
      .catch(() => {});

    fetch(
      `/api/dessert-videos?title=${encodeURIComponent(mainDish.title)}&year=${yearParam}&director=${encodeURIComponent(
        mainDishDetails?.director ?? ""
      )}`,
      { signal: controller.signal }
    )
      .then((res) => res.json())
      .then((json) => {
        setDessertVideos(json.videos ?? []);
        setDessertReady(Boolean(json.ready));
        setDessertCategory(json.category ?? null);
      })
      .catch(() => {});

    return () => controller.abort();
  }, [mainDish.id, mainDish.title, mainDish.year, mainDishDetails?.director]);

  return (
    // `fixed` + centered max-w matches the mobile frame from layout.tsx exactly
    // (same technique as BottomNav) — covers only that frame, not the raw viewport,
    // and stays put regardless of the page's scroll position underneath. `fixed`
    // also establishes the containing block for the close button below, so it
    // pins to this frame's corner instead of the browser viewport's.
    <div className="fixed inset-y-0 left-1/2 z-[200] w-full max-w-[430px] -translate-x-1/2 bg-background">
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface-elevated/90 text-lg text-foreground shadow-lg backdrop-blur"
      >
        ✕
      </button>

      <div className="flex h-full flex-col overflow-y-auto">
        {/* padding-top intrinsic-ratio box, not `aspect-ratio` — as a column-flex child,
            `aspect-ratio` alone resolves to 0 height in some browsers since its
            only child is absolutely positioned and contributes no intrinsic size. */}
        <div
          className="relative w-full shrink-0 overflow-hidden bg-black"
          style={{ paddingTop: `${(768 / 1376) * 100}%` }}
        >
          <Image
            src={getTableImage(includeAppetizer, includeDessert)}
            alt="오늘의 테이블"
            fill
            sizes="430px"
            priority
            className="object-cover"
          />
          {/* Sized to the plate's inner concave area (measured against the art), never
              the wider gold rim — fixed % of the table image so it can't spill off the
              plate regardless of viewport size, and re-centers on any aspect ratio since
              this box's own ratio is locked to the source art (1376:768). */}
          {mainDish.posterUrl && (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-sm shadow-2xl ring-1 ring-black/20"
              style={{ left: "50.5%", top: "57%", width: "11%", aspectRatio: "2 / 3" }}
            >
              <Image src={mainDish.posterUrl} alt={mainDish.title} fill sizes="60px" className="object-cover" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-8 px-6 py-6 pb-12">
          {includeAppetizer && (
            <section>
              <h3 className={`${songMyung.className} text-xl text-foreground`}>🥗 에피타이저 · 예고편</h3>
              {trailerVideo === undefined ? (
                <p className="mt-3 text-xs text-muted">예고편을 찾는 중&hellip;</p>
              ) : !trailerReady ? (
                <p className="mt-3 text-xs leading-relaxed text-muted">
                  YouTube API 키가 설정되면 이 작품의 예고편을 자동으로 찾아와요.
                </p>
              ) : trailerVideo ? (
                <VideoEmbed video={trailerVideo} />
              ) : (
                <p className="mt-3 text-xs text-muted">예고편을 찾지 못했어요.</p>
              )}
            </section>
          )}

          <section>
            <h3 className={`${songMyung.className} text-xl text-foreground`}>🍽️ 메인디쉬</h3>
            <div className="mt-3 flex gap-3">
              {mainDish.posterUrl && (
                <div className="relative aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-lg border border-border">
                  <Image src={mainDish.posterUrl} alt={mainDish.title} fill sizes="112px" className="object-cover" />
                </div>
              )}
              <div className="min-w-0 flex-1 text-sm leading-relaxed text-muted">
                <p className="text-base font-medium text-foreground">
                  {mainDish.title}
                  {mainDish.year ? ` (${mainDish.year})` : ""}
                </p>
                <p>감독 {mainDishDetails?.director ?? "정보 없음"}</p>
                <p>출연 {mainDishDetails?.cast.length ? mainDishDetails.cast.join(", ") : "정보 없음"}</p>
                <p>{mainDishDetails?.ottName ?? "제공 플랫폼 확인 중"}</p>
              </div>
            </div>

            {mainDishDetails?.watchUrl ? (
              <a
                href={mainDishDetails.watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block rounded-xl bg-accent-light py-3 text-center text-sm font-bold text-white"
              >
                메인디쉬 시청하기
              </a>
            ) : (
              <p className="mt-4 text-center text-xs text-muted">시청 가능한 플랫폼을 찾지 못했어요.</p>
            )}
          </section>

          {includeDessert && (
            <section>
              <h3 className={`${songMyung.className} text-xl text-foreground`}>
                🍰 디저트{dessertCategory ? ` · ${DESSERT_CATEGORY_LABELS[dessertCategory]}` : ""}
              </h3>
              {dessertVideos === undefined ? (
                <p className="mt-3 text-xs text-muted">몰입을 도와줄 영상을 찾는 중&hellip;</p>
              ) : !dessertReady ? (
                <p className="mt-3 text-xs leading-relaxed text-muted">
                  YouTube API 키가 설정되면 이 작품에 어울리는 보조 영상을 자동으로 찾아와요.
                </p>
              ) : dessertVideos.length > 0 ? (
                dessertVideos.map((video) => <VideoEmbed key={video.videoId} video={video} />)
              ) : (
                <p className="mt-3 text-xs text-muted">어울리는 영상을 찾지 못했어요.</p>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
