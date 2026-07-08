"use client";

import { useRef, useState } from "react";
import Image from "next/image";

type Slide = {
  eyebrow: string;
  title: string;
  description: string;
};

const SLIDES: Slide[] = [
  {
    eyebrow: "",
    title: "당신의 취향, 한 접시에",
    description:
      "영화, 드라마, 애니메이션, 예능까지. 흩어진 취향을 하나의 코스로 담아드려요.",
  },
  {
    eyebrow: "Any Platform",
    title: "플랫폼은 신경 쓰지 마세요",
    description:
      "넷플릭스부터 라프텔까지, 어디에 있든 당신에게 맞는 작품을 찾아 안내해드려요.",
  },
  {
    eyebrow: "AI Course",
    title: "AI 셰프가 차려주는 감상 코스",
    description:
      "그날의 기분과 취향에 맞춰 AI가 매번 다른 감상 코스를 구성해드려요.",
  },
  {
    eyebrow: "Get Started",
    title: "이제, 당신의 취향을 알려주세요",
    description: "몇 가지 질문에 답하면 나만의 코스가 준비돼요.",
  },
];

export default function IntroSlides({ onComplete }: { onComplete: () => void }) {
  const [index, setIndex] = useState(0);
  const dragStartX = useRef<number | null>(null);
  const dragDeltaX = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

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
    <div className="flex h-full flex-col">
      <div
        className="relative flex-1 touch-pan-y select-none overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div
          className={`flex h-full ${isDragging ? "" : "transition-transform duration-300 ease-out"}`}
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {SLIDES.map((slide) => (
            <div
              key={slide.title}
              className="flex h-full w-full flex-shrink-0 flex-col items-center justify-center gap-8 px-8 text-center"
            >
              <Image
                src="/playting-logo.png"
                alt="Playting"
                width={168}
                height={168}
                priority
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
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-6 px-8 pb-10 pt-2">
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
