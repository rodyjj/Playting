"use client";

import { useState } from "react";
import StepShell from "./StepShell";
import PrimaryButton from "./PrimaryButton";

export default function PeopleStep({
  people,
  onChange,
  onFinish,
  onBack,
  isSubmitting,
}: {
  people: string[];
  onChange: (people: string[]) => void;
  onFinish: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}) {
  const [input, setInput] = useState("");

  const addPerson = (raw: string) => {
    const name = raw.trim();
    if (!name || people.includes(name)) return;
    onChange([...people, name]);
  };

  const removePerson = (name: string) => {
    onChange(people.filter((p) => p !== name));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addPerson(input);
      setInput("");
    } else if (e.key === "Backspace" && input === "" && people.length > 0) {
      removePerson(people[people.length - 1]);
    }
  };

  const handleFinish = () => {
    if (input.trim()) {
      addPerson(input);
      setInput("");
    }
    onFinish();
  };

  return (
    <StepShell
      step={3}
      totalSteps={4}
      title="선호하는 감독, 배우가 있다면 입력해주세요"
      description="없다면 건너뛰어도 괜찮아요. 입력하신 이름은 코스 추천에 참고할게요."
      onBack={onBack}
      footer={
        <div className="flex gap-3">
          <button
            onClick={onFinish}
            disabled={isSubmitting}
            className="shrink-0 rounded-full border border-border px-6 py-3.5 text-sm font-semibold text-muted transition-colors hover:border-accent-light hover:text-foreground active:scale-[0.98] disabled:opacity-50"
          >
            건너뛰기
          </button>
          <div className="min-w-0 flex-1">
            <PrimaryButton onClick={handleFinish} disabled={(people.length === 0 && !input.trim()) || isSubmitting}>
              {isSubmitting ? "코스 준비 중…" : people.length > 0 ? `${people.length}명 추가 · 완료` : "완료"}
            </PrimaryButton>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="이름을 입력하고 Enter를 눌러주세요"
          className="w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm text-foreground placeholder:text-muted focus:border-accent-light focus:outline-none"
        />
        {people.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {people.map((person) => (
              <span
                key={person}
                className="flex items-center gap-2 rounded-full border border-accent-light bg-accent-soft px-3.5 py-2 text-sm font-medium text-foreground"
              >
                #{person}
                <button
                  onClick={() => removePerson(person)}
                  aria-label={`${person} 삭제`}
                  className="text-muted transition-colors hover:text-foreground"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </StepShell>
  );
}
