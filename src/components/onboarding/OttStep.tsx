"use client";

import Image from "next/image";
import { OTT_PROVIDERS } from "@/data/ott-providers";
import StepShell from "./StepShell";
import PrimaryButton from "./PrimaryButton";

export default function OttStep({
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
      step={1}
      totalSteps={4}
      title="구독 중인 OTT를 알려주세요"
      description="선택한 서비스에 있는 작품 위주로 추천해드려요. 여러 개 선택할 수 있어요."
      onBack={onBack}
      footer={
        <PrimaryButton onClick={onNext} disabled={selected.length === 0}>
          {selected.length > 0 ? `${selected.length}개 선택 · 다음` : "다음"}
        </PrimaryButton>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {OTT_PROVIDERS.map((provider) => {
          const isSelected = selected.includes(provider.id);
          return (
            <button
              key={provider.id}
              onClick={() => onToggle(provider.id)}
              className={`relative flex flex-col items-center gap-2.5 rounded-2xl border px-3 py-4 transition-all ${
                isSelected
                  ? "border-accent-light bg-accent-soft shadow-[0_0_0_1px_var(--accent-light)]"
                  : "border-border bg-surface hover:border-accent-light/50"
              }`}
            >
              {isSelected && (
                <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent-light">
                  <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="white" strokeWidth="3">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
              <Image
                src={provider.iconUrl}
                alt={provider.name}
                width={40}
                height={40}
                className="h-10 w-10 rounded-xl"
              />
              <span className="text-xs font-medium text-foreground">{provider.name}</span>
            </button>
          );
        })}
      </div>
    </StepShell>
  );
}
