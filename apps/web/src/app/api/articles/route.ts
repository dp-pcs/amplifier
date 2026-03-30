import { NextRequest, NextResponse } from "next/server";

interface SubstackPost {
  id: number;
  title: string;
  subtitle?: string;
  slug: string;
  post_date: string;
  canonical_url: string;
  description?: string;
  cover_image?: string;
  publishedBylines?: Array<{ name: string }>;
}

interface CleanedArticle {
  id: number;
  title: string;
  subtitle: string | null;
  date: string;
  url: string;
  description: string | null;
  coverImage: string | null;
  authors?: string[];
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const handle = searchParams.get("handle");
  const offset = searchParams.get("offset") || "0";
  const limit = searchParams.get("limit") || "20";

  if (!handle) {
    return NextResponse.json(
      { error: "Substack handle is required" },
      { status: 400 }
    );
  }

  // Validate handle format (basic alphanumeric + hyphens)
  if (!/^[a-zA-Z0-9-]+$/.test(handle)) {
    return NextResponse.json(
      { error: "Invalid Substack handle format" },
      { status: 400 }
    );
  }

  try {
    const substackUrl = `https://${handle}.substack.com/api/v1/posts?limit=${limit}&offset=${offset}`;

    const response = await fetch(substackUrl, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Substack publication not found" },
          { status: 404 }
        );
      }
      throw new Error(`Substack API returned ${response.status}`);
    }

    const data = await response.json();

    // Clean and format the response
    const articles: CleanedArticle[] = (data as SubstackPost[]).map((post) => ({
      id: post.id,
      title: post.title,
      subtitle: post.subtitle || null,
      date: post.post_date,
      url: post.canonical_url,
      description: post.description || null,
      coverImage: post.cover_image || null,
      authors: post.publishedBylines?.map(byline => byline.name) || [],
    }));

    return NextResponse.json({
      articles,
      handle,
      offset: parseInt(offset),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error("Error fetching Substack articles:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles from Substack" },
      { status: 500 }
    );
  }
}
