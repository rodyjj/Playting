"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveOnboardingComplete } from "@/lib/onboarding";
import Header from "@/components/home/Header";
import SearchBar from "@/components/home/SearchBar";
import PromoCarousel from "@/components/home/PromoCarousel";
import EventBanner from "@/components/home/EventBanner";
import CourseList from "@/components/home/CourseList";

export default function Home() {
  const router = useRouter();
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    resolveOnboardingComplete().then((complete) => {
      if (cancelled) return;
      if (complete) setIsComplete(true);
      else router.replace("/onboarding");
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!isComplete) return null;

  return (
    <div className="min-h-dvh w-full pb-16">
      <Header />
      <SearchBar />
      <PromoCarousel />
      <EventBanner />
      <CourseList />
    </div>
  );
}
