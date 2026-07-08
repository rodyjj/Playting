import { NextResponse } from "next/server";
import { analyzeDessertStrategy, isGeminiConfigured } from "@/lib/gemini";
import { findSupplementaryVideos, isYoutubeConfigured } from "@/lib/youtube";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.trim() ?? "";
  const yearParam = searchParams.get("year");
  const year = yearParam ? Number(yearParam) : undefined;
  const director = searchParams.get("director")?.trim() || null;

  if (!isYoutubeConfigured() || !isGeminiConfigured() || !title) {
    return NextResponse.json({ ready: false, category: null, videos: [] });
  }

  const strategy = await analyzeDessertStrategy({ title, year, director }).catch(() => ({
    category: "general" as const,
    searchQuery: `${title} 비하인드`,
  }));
  const videos = await findSupplementaryVideos(strategy.searchQuery, 2);

  return NextResponse.json({ ready: true, category: strategy.category, videos });
}
