"use client";

import { GENRES } from "@/data/genres";
import StepShell from "./StepShell";
import PrimaryButton from "./PrimaryButton";

export default function GenreStep({
  selected,
  onToggle,
  onNext,
  onBack,
}: {
  selected: string[];
  onToggle: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <StepShell
      step={2}
      totalSteps={4}
      title="어떤 장르를 좋아하세요?"
      description="끌리는 태그를 마음껏 골라주세요. 코스 구성에 반영할게요."
      onBack={onBack}
      footer={
        <PrimaryButton onClick={onNext} disabled={selected.length === 0}>
          {selected.length > 0 ? `${selected.length}개 선택 · 다음` : "다음"}
        </PrimaryButton>
      }
    >
      <div className="flex flex-wrap gap-2.5">
        {GENRES.map((genre) => {
          const isSelected = selected.includes(genre.id);
          return (
            <button
              key={genre.id}
              onClick={() => onToggle(genre.id)}
              className={`rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-95 ${
                isSelected
                  ? "border-accent-light bg-accent-light text-white"
                  : "border-border bg-surface text-muted hover:border-accent-light/50 hover:text-foreground"
              }`}
            >
              #{genre.label}
            </button>
          );
        })}
      </div>
    </StepShell>
  );
}
