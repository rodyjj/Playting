"use client";

import { useState } from "react";
import { GENRES, GENRE_CATEGORIES } from "@/data/genres";
import StepShell from "./StepShell";
import PrimaryButton from "./PrimaryButton";

function genreButtonClass(isSelected: boolean) {
  return `rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-95 ${
    isSelected
      ? "border-accent-light bg-accent-light text-white"
      : "border-border bg-surface text-muted hover:border-accent-light/50 hover:text-foreground"
  }`;
}

const PRESET_GENRE_IDS = new Set(GENRES.map((g) => g.id));

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
  const [customInput, setCustomInput] = useState("");

  // Tags the user typed in themselves — anything selected that isn't one of the preset ids.
  const customTags = selected.filter((id) => !PRESET_GENRE_IDS.has(id));

  const applyCustomTag = () => {
    const tag = customInput.trim();
    if (!tag || selected.includes(tag)) return;
    onToggle(tag);
    setCustomInput("");
  };

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
      <div className="flex flex-col gap-5">
        <div>
          <p className="mb-2 text-xs font-semibold text-muted">직접 입력</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyCustomTag();
                }
              }}
              placeholder="찾는 장르가 없다면 직접 입력해보세요"
              className="min-w-0 flex-1 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent-light focus:outline-none"
            />
            <button
              type="button"
              onClick={applyCustomTag}
              disabled={!customInput.trim()}
              className="shrink-0 rounded-2xl border border-accent-light px-4 py-3 text-sm font-semibold text-accent-light transition-colors active:scale-95 disabled:opacity-40"
            >
              태그 적용
            </button>
          </div>
          {customTags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2.5">
              {customTags.map((tag) => (
                <button key={tag} onClick={() => onToggle(tag)} className={genreButtonClass(true)}>
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {GENRE_CATEGORIES.map((category) => (
          <div key={category}>
            <p className="mb-2 text-xs font-semibold text-muted">{category}</p>
            <div className="flex flex-wrap gap-2.5">
              {GENRES.filter((genre) => genre.category === category).map((genre) => (
                <button
                  key={genre.id}
                  onClick={() => onToggle(genre.id)}
                  className={genreButtonClass(selected.includes(genre.id))}
                >
                  #{genre.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </StepShell>
  );
}
