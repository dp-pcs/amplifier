import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

// Gemini native image generation (Nano Banana) - uses generateContent with responseModalities
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.0-flash-preview-image-generation";

async function generateImage(apiKey: string, prompt: string): Promise<{ image: string; mimeType: string }> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: {
            aspectRatio: "16:9",
          },
        },
      }),
      signal: AbortSignal.timeout(90000),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini image API error: ${response.status} ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  const imagePart = parts?.find((p: any) => p.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    throw new Error("No image data in Gemini response");
  }

  return {
    image: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || "image/png",
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { items } = await req.json();
    if (!items?.length) {
      return NextResponse.json({ error: "items array is required" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json({ error: "Infographic generation is not configured on this server" }, { status: 503 });
    }

    const results: Array<{ id: number; image: string; mimeType: string } | { id: number; error: string }> = [];

    for (const item of items) {
      try {
        const styleGuide: Record<string, string> = {
          flow: "Vertical flow diagram with numbered steps and connecting arrows.",
          comparison: "Side-by-side comparison with two columns (Before/After or Option A/B).",
          list: "Bold numbered list with large numbers on the left and descriptions on the right.",
          architecture: "Layered system diagram with boxes, arrows, and labels showing how components connect.",
          stat: "Bold central statistic in huge text with supporting context below.",
        };
        const style = item.infographicStyle || "list";
        const layoutInstruction = styleGuide[style] || styleGuide.list;

        const prompt = `Create a professional LinkedIn-ready infographic.

Article: ${item.articleTitle}
Theme/Angle: ${item.angle}
Key Insight: ${item.keyInsight}
${item.url ? `URL: ${item.url}` : ""}

Layout style: ${layoutInstruction}

Design specifications:
- Dark background (deep navy, #0F0F1A)
- Modern tech aesthetic, purple (#9333EA) and blue (#3B82F6) accent colors
- Theme/angle as the headline in large bold text at the top
- 3-5 key points that illustrate the insight using the specified layout style
- Clean minimal design, strong visual hierarchy, plenty of white space
- URL in small text at the bottom
- LinkedIn landscape dimensions (1200x627px)
- High contrast, professional sans-serif typography`;

        const { image, mimeType } = await generateImage(apiKey, prompt);
        results.push({ id: item.id, image, mimeType });
      } catch (err) {
        console.error(`Infographic failed for item ${item.id}:`, err);
        results.push({ id: item.id, error: String(err) });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error generating infographic batch:", error);
    return NextResponse.json({ error: "Failed to generate infographics" }, { status: 500 });
  }
}
