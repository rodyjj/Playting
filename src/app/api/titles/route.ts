import { NextResponse } from "next/server";
import { isTmdbConfigured, searchTitles } from "@/lib/tmdb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (!isTmdbConfigured() || query.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchTitles(query);
  return NextResponse.json({ results });
}
