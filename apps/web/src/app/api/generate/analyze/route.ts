import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUser } from "@/lib/db";
import { generateText } from "@/lib/ai-client";

/** Fetch a URL and strip HTML to plain text */
async function fetchArticleText(url: string): Promise<string> {
  try {
    // Validate URL before fetching — Node throws "string did not match expected pattern" for bad URLs
    new URL(url);
  } catch {
    return "";
  }
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "AmplifierBot/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return "";
    const html = await res.text();

    // Strip script/style/nav/footer
    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<header[\s\S]*?<\/header>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<\/?(p|div|section|article|h[1-6]|li|blockquote|br)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/[^\S\n]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // Drop short boilerplate lines
    text = text
      .split("\n")
      .filter(line => line.trim().split(/\s+/).length >= 4)
      .join("\n");

    return text.substring(0, 14000); // pass 1 digests this, pass 2 gets the compact digest
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, subtitle, url, description, isOwnArticle } = await req.json();

    if (!title || !url) {
      return NextResponse.json({ error: "title and url are required" }, { status: 400 });
    }

    const user = await getUser(session.user.email);
    if (!user?.aiApiKey || !user?.aiBaseUrl || !user?.aiModel) {
      return NextResponse.json(
        { error: "ai_key_required", message: "Add your AI provider key in Settings" },
        { status: 402 }
      );
    }

    // Fetch the full article text server-side
    const fullText = await fetchArticleText(url);

    // Pass 1: Extract key insights from full article (compact digest)
    let articleDigest = "";
    if (fullText) {
      const digestPrompt = `Extract the key content from this article for a content campaign.

Article Title: ${title}
${subtitle ? `Subtitle: ${subtitle}` : ""}
Full Text:
${fullText}

Return a JSON object with:
{
  "mainArgument": "1-2 sentence core thesis",
  "keyPoints": ["up to 10 specific insights, facts, data points, or quotes from the article"],
  "frameworks": ["any models, frameworks, or processes described"],
  "statistics": ["any specific numbers, percentages, or metrics mentioned"],
  "quotableLines": ["3-5 strong standalone sentences that could work as hooks"]
}

Return ONLY valid JSON, no markdown.`;

      try {
        const digestRaw = await generateText(digestPrompt, "You are a precise content analyst. Extract facts faithfully. Return only valid JSON.", {
          baseUrl: user.aiBaseUrl,
          apiKey: user.aiApiKey,
          model: user.aiModel,
          maxTokens: 2000,
        });
        const digestJson = digestRaw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
        if (digestJson.startsWith("<") || !digestJson) throw new Error("bad digest response");
        const digest = JSON.parse(digestJson);
        articleDigest = `Main argument: ${digest.mainArgument}
Key points: ${digest.keyPoints?.join(" | ")}
Frameworks: ${digest.frameworks?.join(" | ")}
Statistics: ${digest.statistics?.join(" | ")}
Quotable lines: ${digest.quotableLines?.join(" | ")}`;
      } catch {
        // Fall back to raw text if digest fails
        articleDigest = fullText.substring(0, 4000);
      }
    }

    const perspective = isOwnArticle ? "first person (author)" : "third person (reader/recommender)";

    const toneVariants = ["provocative", "curious", "assertive", "reflective", "contrarian", "inspiring", "analytical", "data-driven", "storytelling", "tactical"];

    const prompt = `You are an expert content strategist creating a 2-week amplification drip campaign.

Article Title: ${title}
${subtitle ? `Subtitle: ${subtitle}` : ""}
Article URL: ${url}
${articleDigest ? `\nArticle Digest:\n${articleDigest}` : description ? `\nDescription: ${description}` : ""}

Your job: Create a comprehensive drip campaign using the specific content from this article.

Tasks:
1. Identify 5-10 distinct angles, themes, key insights, or quotable moments from the article. Base these on the ACTUAL content — specific points, data, examples, or frameworks mentioned. Each angle must be unique.
2. Assign each angle a "dayToPost" (spread from day 1 to day 14 for a 2-week drip).
3. Assign each angle a tone from: ${toneVariants.join(", ")}. Vary the tones across items.
4. For each angle, determine if an infographic would help (complex data, frameworks, step-by-step processes, comparisons, statistics).
5. Write one Substack Note (≤280 chars) for each angle in ${perspective}.
6. Write one LinkedIn post (150-250 words) for each angle in ${perspective}.

Rules for Substack Notes:
- Max 280 characters INCLUDING the URL
- Must include the article URL: ${url}
- Each note has a DIFFERENT hook and tone — no repetition
- Punchy, opinionated, platform-native — not generic

Rules for LinkedIn posts:
- 150-250 words
- Strong opening hook relevant to this specific angle
- 3-4 bullet points or short paragraphs
- Clear CTA with article URL
- 3-4 relevant hashtags at the end
- Each post covers a DIFFERENT aspect of the article

Return ONLY valid JSON (no markdown fences, no explanation):
{
  "articleSummary": "2-3 sentence summary of the article's core argument",
  "totalAngles": <number 5-10>,
  "items": [
    {
      "id": 1,
      "angle": "Brief descriptive name for this angle",
      "keyInsight": "One specific sentence from or about the article content",
      "tone": "provocative",
      "dayToPost": 1,
      "needsInfographic": true,
      "infographicReason": "Specific reason why visual helps here (null if false)",
      "infographicStyle": "flow|comparison|list|architecture|stat",
      "substackNote": "The full note text with URL, max 280 chars",
      "linkedinPost": "The full LinkedIn post"
    }
  ]
}`;

    const systemPrompt = "You are an expert content strategist and copywriter specializing in thought leadership amplification. Return only valid JSON.";

    const raw = await generateText(prompt, systemPrompt, {
      baseUrl: user.aiBaseUrl,
      apiKey: user.aiApiKey,
      model: user.aiModel,
      maxTokens: 8000,
    });

    let jsonStr = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    // Detect HTML error pages from the AI provider (e.g. 4xx/5xx returned as body)
    if (jsonStr.startsWith("<") || jsonStr.toLowerCase().startsWith("<!doctype") || jsonStr.toLowerCase().startsWith("<html")) {
      console.error("AI provider returned HTML instead of JSON. First 200 chars:", jsonStr.substring(0, 200));
      throw new Error("AI provider returned an error page — check your API key and base URL in Settings");
    }

    // If response is empty
    if (!jsonStr) {
      throw new Error("AI provider returned an empty response — the model may not support this request");
    }

    // If JSON is truncated, try to recover by closing open structures
    let analysis: any;
    try {
      analysis = JSON.parse(jsonStr);
    } catch {
      // Attempt repair: find last complete item in the items array and close the JSON
      const lastCompleteItem = jsonStr.lastIndexOf('},');
      const lastBrace = jsonStr.lastIndexOf('}');
      const cutAt = lastCompleteItem > 0 ? lastCompleteItem + 1 : lastBrace;
      if (cutAt > 0) {
        const repaired = jsonStr.substring(0, cutAt) + ']}';
        try {
          analysis = JSON.parse(repaired);
          console.warn("Repaired truncated JSON response");
        } catch {
          console.error("JSON repair failed. Raw:", jsonStr.substring(0, 300));
          throw new Error("AI returned malformed JSON — try a different model or check your Settings");
        }
      } else {
        console.error("Unparseable response:", jsonStr.substring(0, 300));
        throw new Error("AI returned malformed JSON — try a different model or check your Settings");
      }
    }

    // Validate URLs in notes
    for (const item of analysis.items) {
      if (!item.substackNote.includes(url)) {
        const maxLen = 280 - url.length - 2;
        item.substackNote = item.substackNote.substring(0, maxLen).trim() + " " + url;
      }
      if (item.substackNote.length > 280) {
        item.substackNote = item.substackNote.substring(0, 277) + "...";
      }
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Error analyzing article:", error);
    return NextResponse.json({ error: "Failed to analyze article" }, { status: 500 });
  }
}
