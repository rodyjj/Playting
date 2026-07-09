import { NextResponse } from "next/server";
import { isGeminiConfigured } from "@/lib/gemini";
import { isYoutubeConfigured } from "@/lib/youtube";
import { getMixedTimeCourse, getTimeCourseBand, isTimeCourseQuietHours } from "@/lib/time-course";
import { getCurrentBand, isTimeBand } from "@/lib/time-bands";

export async function GET(request: Request) {
  const configured = isYoutubeConfigured() && isGeminiConfigured();
  const currentRealBand = getCurrentBand();

  if (!configured) {
    return NextResponse.json({ configured: false, resolvedBand: currentRealBand ?? "mixed", currentRealBand, items: [] });
  }

  const { searchParams } = new URL(request.url);
  const bandParam = searchParams.get("band");
  const genres = [...new Set((searchParams.get("genres") ?? "").split(",").map((g) => g.trim()).filter(Boolean))].sort();

  // An explicit band forces that preview regardless of the real clock (tab
  // switching in the UI); "auto"/missing follows the actual current band, or
  // the mixed fallback when it's outside all three windows.
  const resolvedBand = bandParam && isTimeBand(bandParam) ? bandParam : currentRealBand;

  // TEMPORARY (see isTimeCourseQuietHours) — checked before touching either
  // cached builder, so quiet hours never trigger a Gemini/YouTube call at all.
  if (isTimeCourseQuietHours()) {
    return NextResponse.json({
      configured: true,
      resolvedBand: resolvedBand ?? "mixed",
      currentRealBand,
      items: [],
      quietHours: true,
    });
  }

  const items = resolvedBand ? await getTimeCourseBand(resolvedBand, genres) : await getMixedTimeCourse(genres);

  return NextResponse.json({ configured: true, resolvedBand: resolvedBand ?? "mixed", currentRealBand, items });
}
