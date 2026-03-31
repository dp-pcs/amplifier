import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUser } from "@/lib/db";

export const dynamic = "force-dynamic";

// In-memory cache (10 min TTL — Substack updates every few minutes)
const statsCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

export interface SubstackPostStats {
  views: number;
  opens: number;
  openRate: number;
  clicks: number;
  clickThroughRate: number;
  sent: number;
  signups: number;
  likes: number;
  restacks: number;
  comments: number;
  engagementRate: number;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const handle = req.nextUrl.searchParams.get("handle");
    const slug = req.nextUrl.searchParams.get("slug");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50", 10);

    if (!handle) {
      return NextResponse.json({ error: "Missing handle parameter" }, { status: 400 });
    }

    const cacheKey = `${handle}:${limit}`;
    const cached = statsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      const data = cached.data;
      if (slug) {
        return NextResponse.json(data[slug] || null);
      }
      return NextResponse.json(data);
    }

    const user = await getUser(session.user.email);
    if (!user?.substackCookie) {
      return NextResponse.json({ error: "Substack cookie not configured" }, { status: 400 });
    }

    const resp = await fetch(
      `https://${handle}.substack.com/api/v1/post_management/published?offset=0&limit=${limit}&order_by=post_date&order_direction=desc`,
      {
        headers: {
          Cookie: `connect.sid=${user.substackCookie.replace(/^connect\.sid=/, "")}`,
          "User-Agent": "Mozilla/5.0 (compatible; Amplifier/1.0)",
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!resp.ok) {
      console.error("Substack stats fetch failed:", resp.status);
      return NextResponse.json({ error: "Failed to fetch Substack stats" }, { status: resp.status });
    }

    const data = await resp.json();
    const posts = data.posts || [];

    // Build a slug → stats map
    const statsBySlug: Record<string, SubstackPostStats> = {};
    for (const post of posts) {
      if (!post.slug || !post.stats) continue;
      const s = post.stats;
      statsBySlug[post.slug] = {
        views: s.views ?? 0,
        opens: s.opens ?? 0,
        openRate: s.open_rate ?? 0,
        clicks: s.clicks ?? 0,
        clickThroughRate: s.click_through_rate ?? 0,
        sent: s.sent ?? 0,
        signups: s.signups ?? 0,
        likes: s.likes ?? 0,
        restacks: s.restacks ?? 0,
        comments: s.comments ?? 0,
        engagementRate: s.engagement_rate ?? 0,
      };
    }

    statsCache.set(cacheKey, { data: statsBySlug, expiresAt: Date.now() + CACHE_TTL_MS });

    if (slug) {
      return NextResponse.json(statsBySlug[slug] || null);
    }
    return NextResponse.json(statsBySlug);
  } catch (error) {
    console.error("Error fetching Substack stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
