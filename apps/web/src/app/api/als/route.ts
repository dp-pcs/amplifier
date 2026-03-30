import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// In-memory cache for als links (idempotent: same URL always returns same links)
const linkCache = new Map<string, { linkedin: string; email: string }>();

export const dynamic = "force-dynamic";

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

    // Run als shorten command to get all tracking links
    try {
      const { stdout } = await execAsync(`als shorten "${url}"`);

      // Parse the text output - als returns plain text with multiple source links
      // Format: "    LinkedIn      https://aicoe.fit/xxxxx-xxxxxx"
      const lines = stdout.split('\n');
      const linkedinMatch = lines.find(line => line.trim().startsWith('LinkedIn'));
      const linkedinUrl = linkedinMatch ? linkedinMatch.split(/\s+/).pop() : url;

      // Use X (Twitter) as email fallback since there's no dedicated email source
      const xMatch = lines.find(line => line.trim().startsWith('X'));
      const emailUrl = xMatch ? xMatch.split(/\s+/).pop() : url;

      const links = {
        linkedin: linkedinUrl || url,
        email: emailUrl || url,
      };

      // Cache the result
      linkCache.set(url, links);

      return NextResponse.json(links);
    } catch (error) {
      // Fallback to original URL if als fails
      console.error("als command failed:", error);
      const fallback = { linkedin: url, email: url };
      return NextResponse.json(fallback);
    }
  } catch (error) {
    console.error("Error in als route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
