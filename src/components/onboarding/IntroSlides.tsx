"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type Slide = {
  eyebrow: string;
  title: string;
  description: string;
  // Full-bleed slides carry all their own copy baked into the artwork, so no
  // eyebrow/title/description is rendered — title is kept only as alt text.
  // bgColor matches the image's own bottom edge, since object-contain
  // anchored to the top means any leftover space (aspect-ratio dependent)
  // always lands at the bottom, right up against that edge.
  image?: string;
  bgColor?: string;
  // Ignores FOOTER_HEIGHT entirely and covers the full screen (object-cover,
  // cropping instead of letterboxing) — the footer floats on top of it
  // instead of sitting on its own reserved strip below.
  fullBleed?: boolean;
};

// Fixed footer height (dots + gap + button + its own padding) — used to give
// every non-full-bleed slide the same usable height it always had, now that
// the track spans the whole screen so the one full-bleed slide can reach the
// bottom edge. The footer's own content has no responsive height variance
// (single-line label, fixed paddings), so this stays accurate across widths.
const FOOTER_HEIGHT = 126;

const SLIDES: Slide[] = [
  {
    eyebrow: "",
    title: "당신의 취향, 한 접시에",
    description:
      "영화, 드라마, 애니메이션, 예능까지. 흩어진 취향을 하나의 코스로 담아드려요.",
    image: "/table/onboarding-1.png",
    bgColor: "#01010c",
  },
  {
    eyebrow: "Any Platform",
    title: "플랫폼은 신경 쓰지 마세요",
    description:
      "넷플릭스부터 라프텔까지, 어디에 있든 당신에게 맞는 작품을 찾아 안내해드려요.",
    image: "/table/onboarding-2.png",
    bgColor: "#1f110e",
    fullBleed: true,
  },
  {
    eyebrow: "AI Course",
    title: "AI 셰프가 차려주는 감상 코스",
    description:
      "그날의 기분과 취향에 맞춰 AI가 매번 다른 감상 코스를 구성해드려요.",
    image: "/table/onboarding-3.png",
    bgColor: "#010c24",
  },
];

export default function IntroSlides({ onComplete }: { onComplete: () => void }) {
  const [index, setIndex] = useState(0);
  const dragStartX = useRef<number | null>(null);
  const dragDeltaX = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Percentage-based translateX/width (100%, w-full) lets the browser round
  // the container's box and each slide's box independently — on a non-integer
  // CSS width (e.g. 375.2px) those roundings can disagree by a device pixel,
  // which shows up as a hairline sliver of the neighboring slide right after
  // a swipe. Measuring once and driving both the track offset and each
  // slide's width off the same JS number (in px) removes that ambiguity.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isLast = index === SLIDES.length - 1;

  const goTo = (next: number) => {
    setIndex(Math.min(Math.max(next, 0), SLIDES.length - 1));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
    dragDeltaX.current = 0;
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragStartX.current === null) return;
    dragDeltaX.current = e.clientX - dragStartX.current;
  };

  const handlePointerUp = () => {
    if (dragStartX.current === null) return;
    const delta = dragDeltaX.current;
    const threshold = 50;
    if (delta <= -threshold) {
      // swiped left -> next
      if (isLast) onComplete();
      else goTo(index + 1);
    } else if (delta >= threshold) {
      goTo(index - 1);
    }
    dragStartX.current = null;
    dragDeltaX.current = 0;
    setIsDragging(false);
  };

  return (
    // Background follows the active slide's own color (image slides only —
    // text slides pass no bgColor and this falls back to the page default),
    // so the footer strip below the image reads as one continuous backdrop
    // instead of a visible seam where the image's letterbox gap ends.
    <div
      className="relative h-full transition-colors duration-300"
      style={{ backgroundColor: SLIDES[index].bgColor }}
    >
      <div
        ref={containerRef}
        className="absolute inset-0 touch-pan-y select-none overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div
          className={`flex h-full ${isDragging ? "" : "transition-transform duration-300 ease-out"}`}
          style={{ transform: `translateX(${-(index * containerWidth)}px)` }}
        >
          {SLIDES.map((slide, slideIndex) =>
            slide.image ? (
              <div key={slide.title} className="h-full flex-shrink-0" style={{ width: containerWidth || "100%" }}>
                <div
                  className="relative w-full"
                  style={{
                    // Full-bleed slide keeps its full height and reaches the
                    // true bottom edge; every other slide reserves the same
                    // strip the footer used to occupy in-flow, so its image
                    // still sizes exactly as it did before the footer became
                    // a floating overlay.
                    height: slide.fullBleed ? "100%" : `calc(100% - ${FOOTER_HEIGHT}px)`,
                    backgroundColor: slide.bgColor,
                  }}
                >
                  <Image
                    src={slide.image}
                    alt={slide.title}
                    fill
                    sizes="(max-width: 430px) 100vw, 430px"
                    priority={slideIndex === 0}
                    className={slide.fullBleed ? "object-cover" : "object-contain object-top"}
                  />
                </div>
              </div>
            ) : (
              <div key={slide.title} className="h-full flex-shrink-0" style={{ width: containerWidth || "100%" }}>
                <div
                  className="flex w-full flex-col items-center justify-center gap-8 px-8 text-center"
                  style={{ height: `calc(100% - ${FOOTER_HEIGHT}px)` }}
                >
                  <Image
                    src="/playting-logo.png"
                    alt="Playting"
                    width={168}
                    height={168}
                    className="h-40 w-40 rounded-3xl sm:h-48 sm:w-48"
                  />
                  <div className="flex flex-col items-center gap-3">
                    {slide.eyebrow && (
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-light">
                        {slide.eyebrow}
                      </span>
                    )}
                    <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                      {slide.title}
                    </h1>
                    <p className="max-w-xs text-sm leading-relaxed text-muted sm:text-base">
                      {slide.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      <div
        className={`absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-6 px-8 pb-10 pt-2 ${
          SLIDES[index].fullBleed ? "backdrop-blur-md bg-gradient-to-t from-black/55 via-black/25 to-transparent" : ""
        }`}
      >
        <div className="flex items-center gap-2">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.title}
              aria-label={`${i + 1}번 슬라이드로 이동`}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-6 bg-accent-light" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => (isLast ? onComplete() : goTo(index + 1))}
          className="w-full max-w-xs rounded-full bg-accent py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_var(--accent)] transition-colors hover:bg-accent-light active:scale-[0.98]"
        >
          {isLast ? "시작하기" : "다음"}
        </button>
      </div>
    </div>
  );
}
