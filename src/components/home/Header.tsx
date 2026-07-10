"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LoginIcon, MyPageIcon } from "@/components/nav/icons";
import GenreEditScreen from "@/components/onboarding/GenreEditScreen";

export default function Header() {
  const [isMyPageOpen, setIsMyPageOpen] = useState(false);
  const [isGenreEditOpen, setIsGenreEditOpen] = useState(false);

  // Lets the phone's hardware/gesture back button close the drawer (instead of
  // navigating away from the page) — closing always goes through this listener,
  // even when triggered by the in-drawer X button (see closeMyPage), so there's
  // one single source of truth for "the drawer just closed".
  useEffect(() => {
    const onPopState = () => setIsMyPageOpen(false);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Locks background scroll while the drawer is open, matching the standard
  // modal/drawer convention of not letting the page scroll underneath it.
  useEffect(() => {
    if (!isMyPageOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMyPageOpen]);

  const openMyPage = () => {
    window.history.pushState({ playtingMyPage: true }, "");
    setIsMyPageOpen(true);
  };

  const closeMyPage = () => {
    if (window.history.state?.playtingMyPage) {
      window.history.back();
    } else {
      setIsMyPageOpen(false);
    }
  };

  return (
    <>
      <header className="flex items-center justify-between px-6 pt-6">
        <Link href="/" aria-label="홈으로 이동" className="inline-flex items-center">
          <Image
            src="/playting-wordmark.png"
            alt="Playting"
            width={489}
            height={160}
            priority
            className="h-9 w-auto"
          />
        </Link>
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="로그인"
            className="flex flex-col items-center gap-0.5 text-muted transition-colors hover:text-foreground"
          >
            <LoginIcon className="h-5 w-5" />
            <span className="text-[10px] font-medium">로그인</span>
          </button>
          <button
            type="button"
            onClick={openMyPage}
            aria-label="마이페이지"
            className="flex flex-col items-center gap-0.5 text-muted transition-colors hover:text-foreground"
          >
            <MyPageIcon className="h-5 w-5" />
            <span className="text-[10px] font-medium">마이페이지</span>
          </button>
        </div>
      </header>

      {/* Same `fixed` + centered `max-w-[430px]` trick as CourseModal/BottomNav —
          aligns exactly with the app's mobile frame (and sizes to the actual
          *viewport* height, not the page's full scrollable height, which an
          `absolute` container relative to the tall frame div would). Its own
          `overflow-hidden` is what clips the drawer's closed position
          (translated off past the right edge) instead of letting it float
          past the frame into the browser's margin on wide viewports. Purely a
          positioning context, so it can stay mounted and inert
          (`pointer-events-none`) while closed. */}
      <div className="pointer-events-none fixed inset-y-0 left-1/2 z-[200] w-full max-w-[430px] -translate-x-1/2 overflow-hidden">
        <div
          onClick={closeMyPage}
          aria-hidden={!isMyPageOpen}
          className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
            isMyPageOpen ? "pointer-events-auto opacity-100" : "opacity-0"
          }`}
        />
        <aside
          aria-hidden={!isMyPageOpen}
          className={`absolute inset-y-0 right-0 flex w-[82%] flex-col rounded-l-2xl bg-background shadow-2xl transition-transform duration-300 ${
            isMyPageOpen ? "translate-x-0 pointer-events-auto" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-5 pt-6 pb-4">
            <h2 className="text-lg font-bold text-foreground">마이페이지</h2>
            <button
              type="button"
              onClick={closeMyPage}
              aria-label="마이페이지 닫기"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-elevated/90 text-lg text-foreground shadow-lg"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-col gap-3 px-5">
            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-sm font-medium text-foreground">Guest 로그인 상태입니다.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsGenreEditOpen(true)}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-left"
            >
              <span className="min-w-0">
                <span className="block text-sm font-bold text-foreground">선호 장르 재설정</span>
                <span className="block text-xs text-muted">홈 화면 추천에 반영할 장르를 다시 골라요</span>
              </span>
              <span className="shrink-0 pl-3 text-lg text-muted">›</span>
            </button>
          </div>
        </aside>
      </div>

      {isGenreEditOpen && <GenreEditScreen onClose={() => setIsGenreEditOpen(false)} />}
    </>
  );
}
