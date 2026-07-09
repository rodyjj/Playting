import { NextResponse } from "next/server";
import {
  getCombinedRanking,
  getPlatformRanking,
  isRankingPlatformSupported,
  isTmdbConfigured,
} from "@/lib/tmdb";
import { getNetflixTop10Sections } from "@/lib/netflix-top10";

export async function GET(request: Request) {
  if (!isTmdbConfigured()) {
    return NextResponse.json({ configured: false, sections: [] });
  }

  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") ?? "all";

  // Netflix gets its own real, official ranking (Netflix's public weekly Top10
  // dataset) instead of the TMDB-popularity-based ranking every other
  // platform tab uses — see lib/netflix-top10.ts for why.
  if (platform === "netflix") {
    const { sections, weekOf } = await getNetflixTop10Sections();
    return NextResponse.json({ configured: true, sections, weekOf });
  }

  if (platform === "all") {
    const items = await getCombinedRanking(20);
    return NextResponse.json({ configured: true, sections: [{ label: "", items }] });
  }

  if (!isRankingPlatformSupported(platform)) {
    return NextResponse.json({ configured: true, sections: [], unsupported: true });
  }

  const items = await getPlatformRanking(platform, 20);
  return NextResponse.json({ configured: true, sections: [{ label: "", items }] });
}
