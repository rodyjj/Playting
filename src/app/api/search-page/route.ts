import { NextResponse } from "next/server";
import { getSearchPageData, isTmdbConfigured } from "@/lib/tmdb";

export async function GET(request: Request) {
  if (!isTmdbConfigured()) {
    return NextResponse.json({ configured: false, data: null });
  }

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  const mediaType = searchParams.get("mediaType") === "movie" ? "movie" : "tv";
  const title = searchParams.get("title") ?? "";

  if (!id) {
    return NextResponse.json({ configured: true, data: null });
  }

  const data = await getSearchPageData({ id, mediaType, title }).catch(() => null);
  return NextResponse.json({ configured: true, data });
}
