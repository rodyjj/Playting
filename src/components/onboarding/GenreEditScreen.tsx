"use client";

import { useEffect, useState } from "react";
import GenrePicker from "./GenrePicker";
import PrimaryButton from "./PrimaryButton";
import { fetchOnboardingData, submitOnboarding, type OnboardingData } from "@/lib/onboarding";

/**
 * Lets a returning user re-pick their preferred genres from 마이페이지 without
 * redoing the full onboarding flow. Reuses the same GenrePicker as GenreStep,
 * but saves through submitOnboarding immediately (carrying over the rest of
 * their existing profile) instead of advancing to the next wizard stage.
 */
export default function GenreEditScreen({ onClose }: { onClose: () => void }) {
  const [profile, setProfile] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchOnboardingData().then((data) => {
      if (cancelled) return;
      setProfile(data);
      setSelected(data?.preferredGenres ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const handleSave = async () => {
    setSaving(true);
    await submitOnboarding({
      age: profile?.age ?? 25,
      subscribedOtt: profile?.subscribedOtt ?? [],
      preferredGenres: selected,
      preferredPeople: profile?.preferredPeople ?? [],
    });
    setSaving(false);
    onClose();
  };

  return (
    // Same `fixed` + centered `max-w-[430px]` frame trick as CourseModal, but
    // a higher z-index so it layers above the mypage drawer it's opened from.
    <div className="fixed inset-y-0 left-1/2 z-[210] w-full max-w-[430px] -translate-x-1/2 bg-background">
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6">
          <h1 className="text-xl font-bold text-foreground">선호 장르 재설정</h1>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-elevated text-lg text-foreground"
          >
            ✕
          </button>
        </div>
        <p className="px-6 pt-2 text-sm text-muted">
          끌리는 태그를 마음껏 골라주세요. 홈 화면 추천 코스에 바로 반영돼요.
        </p>

        <div className="mt-6 flex-1 overflow-y-auto px-6 pb-4">
          {loading ? (
            <p className="text-sm text-muted">불러오는 중&hellip;</p>
          ) : (
            <GenrePicker selected={selected} onToggle={toggle} />
          )}
        </div>

        <div className="px-6 pb-10 pt-4">
          <PrimaryButton onClick={handleSave} disabled={loading || saving || selected.length === 0}>
            {saving ? "저장 중…" : selected.length > 0 ? `${selected.length}개 선택 · 저장하기` : "저장하기"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
