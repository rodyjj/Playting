"use client";

import StepShell from "./StepShell";
import PrimaryButton from "./PrimaryButton";
import GenrePicker from "./GenrePicker";

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
      <GenrePicker selected={selected} onToggle={onToggle} />
    </StepShell>
  );
}
