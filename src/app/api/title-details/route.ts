import { NextResponse } from "next/server";
import { getTitleDetails, isTmdbConfigured } from "@/lib/tmdb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  const mediaType = searchParams.get("mediaType") === "movie" ? "movie" : "tv";

  if (!isTmdbConfigured() || !id) {
    return NextResponse.json({ director: null, cast: [], ottName: null, watchUrl: null });
  }

  const details = await getTitleDetails({ id, mediaType });
  return NextResponse.json(details);
}
