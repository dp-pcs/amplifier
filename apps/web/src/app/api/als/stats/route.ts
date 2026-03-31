import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

const ALS_API_BASE = "https://dumhbtxskncofwwzrmfx.supabase.co/functions/v1";

// In-memory cache (5 min TTL)
const statsCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function slugFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = req.nextUrl.searchParams.get("url");
    const slug = req.nextUrl.searchParams.get("slug") || (url ? slugFromUrl(url) : null);
    const days = parseInt(req.nextUrl.searchParams.get("days") || "30", 10);

    if (!slug) {
      return NextResponse.json({ error: "Missing slug or url parameter" }, { status: 400 });
    }

    const cacheKey = `${slug}:${days}`;
    const cached = statsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.data);
    }

    const resp = await fetch(`${ALS_API_BASE}/article-stats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, days }),
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      return NextResponse.json({ totalClicks: null, dailyClicks: [] });
    }

    const raw = await resp.json();

    const result = {
      slug,
      title: raw.article?.title || null,
      totalClicks: raw.total_clicks ?? 0,
      trackingVariants: raw.tracking_variants ?? 0,
      dailyClicks: (raw.daily_clicks || []).map((d: any) => ({
        date: d.date,
        clicks: d.clicks,
      })),
      shortUrl: raw.article?.short_url || null,
    };

    statsCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching ALS stats:", error);
    return NextResponse.json({ totalClicks: null, dailyClicks: [] });
  }
}
