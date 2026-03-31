import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

// In-memory cache for als links (idempotent: same URL always returns same links)
const linkCache = new Map<string, { linkedin: string; email: string }>();

export const dynamic = "force-dynamic";

const ALS_API_BASE = "https://dumhbtxskncofwwzrmfx.supabase.co/functions/v1";

export async function GET(req: NextRequest) {
  try {
    // Require authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get URL from query params
    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    // Check cache first
    if (linkCache.has(url)) {
      return NextResponse.json(linkCache.get(url));
    }

    const apiKey = process.env.ALS_API_KEY;
    if (!apiKey) {
      console.warn("ALS_API_KEY not set — falling back to original URL");
      return NextResponse.json({ linkedin: url, email: url });
    }

    // Call the ALS Supabase edge function directly (no CLI dependency)
    try {
      const resp = await fetch(`${ALS_API_BASE}/shorten-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(10000),
      });

      if (!resp.ok) {
        console.error("ALS API error:", resp.status, await resp.text());
        return NextResponse.json({ linkedin: url, email: url });
      }

      const data = await resp.json();

      // ALS returns an array of { source, short_url } objects
      // Pick LinkedIn and X (email fallback) sources
      const links = Array.isArray(data?.links) ? data.links : [];
      const linkedinEntry = links.find((l: any) => l.source?.toLowerCase() === "linkedin");
      const xEntry = links.find((l: any) => l.source?.toLowerCase() === "x");

      const result = {
        linkedin: linkedinEntry?.short_url || url,
        email: xEntry?.short_url || url,
      };

      // Cache the result
      linkCache.set(url, result);

      return NextResponse.json(result);
    } catch (error) {
      console.error("ALS API call failed:", error);
      return NextResponse.json({ linkedin: url, email: url });
    }
  } catch (error) {
    console.error("Error in als route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
