"use client";

import StepShell from "./StepShell";
import PrimaryButton from "./PrimaryButton";

const MIN_AGE = 10;
const MAX_AGE = 80;

export default function AgeStep({
  age,
  onChange,
  onNext,
  onBack,
}: {
  age: number;
  onChange: (age: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const clamp = (value: number) => Math.min(Math.max(value, MIN_AGE), MAX_AGE);

  return (
    <StepShell
      step={0}
      totalSteps={4}
      title="나이가 어떻게 되세요?"
      description="연령대에 따라 더 잘 맞는 작품을 찾아드려요."
      onBack={onBack}
      footer={<PrimaryButton onClick={onNext}>다음</PrimaryButton>}
    >
      <div className="flex h-full flex-col items-center justify-center gap-10">
        <div className="flex items-center gap-8">
          <button
            aria-label="나이 감소"
            onClick={() => onChange(clamp(age - 1))}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-xl text-foreground transition-colors hover:border-accent-light hover:text-accent-light active:scale-95"
          >
            −
          </button>
          <div className="flex min-w-[7rem] items-baseline justify-center gap-1">
            <span className="text-6xl font-bold tabular-nums text-foreground">{age}</span>
            <span className="text-lg text-muted">세</span>
          </div>
          <button
            aria-label="나이 증가"
            onClick={() => onChange(clamp(age + 1))}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-xl text-foreground transition-colors hover:border-accent-light hover:text-accent-light active:scale-95"
          >
            +
          </button>
        </div>

        <input
          type="range"
          min={MIN_AGE}
          max={MAX_AGE}
          value={age}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          className="h-1.5 w-full max-w-xs cursor-pointer appearance-none rounded-full bg-border accent-[var(--accent-light)]"
        />
        <div className="flex w-full max-w-xs justify-between text-xs text-muted">
          <span>{MIN_AGE}세</span>
          <span>{MAX_AGE}세</span>
        </div>
      </div>
    </StepShell>
  );
}
