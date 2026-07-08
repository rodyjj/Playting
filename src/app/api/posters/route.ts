import { NextResponse } from "next/server";
import { PROMO_TITLES } from "@/data/promo-titles";
import { isTmdbConfigured, searchPoster, type PosterMediaType } from "@/lib/tmdb";

export async function GET(request: Request) {
  const configured = isTmdbConfigured();
  if (!configured) {
    return NextResponse.json({ configured: false, items: [] });
  }

  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title");

  // Single, on-demand lookup — reusable by any future feature (search results,
  // AI-picked recommendations, etc.) that needs a poster for an arbitrary title.
  if (title) {
    const mediaType = (searchParams.get("mediaType") as PosterMediaType | null) ?? undefined;
    const yearParam = searchParams.get("year");
    const posterUrl = await searchPoster({
      title,
      mediaType,
      year: yearParam ? Number(yearParam) : undefined,
    });
    return NextResponse.json({ configured: true, posterUrl });
  }

  // Batch mode — resolves posters for the curated promo carousel list.
  const resolved = await Promise.all(
    PROMO_TITLES.map(async (item) => ({
      ...item,
      posterUrl: await searchPoster({ title: item.title, mediaType: item.mediaType, year: item.year }),
    }))
  );

  return NextResponse.json({
    configured: true,
    items: resolved.filter((item) => item.posterUrl),
  });
}
