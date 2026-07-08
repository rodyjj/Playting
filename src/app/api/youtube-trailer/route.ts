import { NextResponse } from "next/server";
import { findTrailer, isYoutubeConfigured } from "@/lib/youtube";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.trim() ?? "";
  const yearParam = searchParams.get("year");
  const year = yearParam ? Number(yearParam) : undefined;

  if (!isYoutubeConfigured() || !title) {
    return NextResponse.json({ ready: false, video: null });
  }

  const video = await findTrailer(title, year);
  return NextResponse.json({ ready: true, video });
}
