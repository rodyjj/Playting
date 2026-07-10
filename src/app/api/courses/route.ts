import { NextResponse } from "next/server";
import { generateCourses, isGeminiConfigured } from "@/lib/gemini";
import { resolvePosterAndWatch } from "@/lib/tmdb";

export async function POST(request: Request) {
  if (!isGeminiConfigured()) {
    return NextResponse.json({ configured: false, courses: [] });
  }

  const body = await request.json().catch(() => ({}));
  const genres: string[] = Array.isArray(body?.genres) ? body.genres : [];
  const people: string[] = Array.isArray(body?.people) ? body.people : [];
  const subscribedOtt: string[] = Array.isArray(body?.subscribedOtt) ? body.subscribedOtt : [];

  if (genres.length === 0 && people.length === 0) {
    return NextResponse.json({ configured: true, courses: [] });
  }

  let failed = false;
  const courses = await generateCourses({ genres, people, subscribedOtt }).catch((err) => {
    console.error("generateCourses failed:", err);
    failed = true;
    return [];
  });

  if (failed) {
    // Distinguishes "Gemini errored" from "legitimately nothing to recommend"
    // so the home screen can offer a retry instead of silently showing nothing.
    return NextResponse.json({ configured: true, courses: [], error: true });
  }

  const resolved = await Promise.all(
    courses.map(async (course) => {
      const items = await Promise.all(
        course.items.map(async (item) => {
          const { posterUrl, ottName, watchUrl } = await resolvePosterAndWatch({
            title: item.title,
            mediaType: item.mediaType,
            year: item.year,
          });
          // ottName is TMDB-verified where Gemini's own `ott` guess isn't —
          // prefer it, but keep the guess if TMDB couldn't confirm a provider.
          return { ...item, posterUrl, ott: ottName ?? item.ott, watchUrl };
        })
      );
      // A poster with no resolvable watch link is a dead click — same
      // filtering rule as search results' related titles.
      return { ...course, items: items.filter((item) => item.posterUrl && item.watchUrl) };
    })
  );

  return NextResponse.json({
    configured: true,
    courses: resolved.filter((course) => course.items.length > 0),
  });
}
