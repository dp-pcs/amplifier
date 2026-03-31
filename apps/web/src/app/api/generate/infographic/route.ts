import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description, url } = await req.json();

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Infographic generation is not configured on this server" },
        { status: 503 }
      );
    }

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    // Gemini native image generation (Nano Banana) - uses generateContent with responseModalities
    const imageModel = process.env.GEMINI_IMAGE_MODEL || "gemini-2.0-flash-preview-image-generation";

    const prompt = `Create a professional LinkedIn-ready infographic for an article.

Article Title: ${title}
${description ? `Description: ${description}` : ""}
${url ? `URL: ${url}` : ""}

Design specifications:
- Dark background (deep navy or charcoal)
- Modern, tech-forward aesthetic
- Purple accent colors (#9333EA or similar)
- Title prominently displayed at the top in large, bold text
- 3 key takeaways presented in distinct sections
- Clean, minimal design with plenty of white space
- Professional typography
- URL/attribution at the bottom in smaller text
- LinkedIn post dimensions (1200x627px)
- High contrast for readability

Style: Modern, professional, tech industry, data visualization aesthetic`;

    // Call Gemini native image generation via generateContent
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent`,
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
      console.error("Gemini image API error:", response.status, errText);
      throw new Error(`Image generation failed: ${response.status} ${errText.slice(0, 200)}`);
    }

    const data = await response.json();

    // Gemini response: candidates[0].content.parts[] with inlineData
    const parts = data?.candidates?.[0]?.content?.parts;
    const imagePart = parts?.find((p: any) => p.inlineData?.data);

    if (!imagePart?.inlineData?.data) {
      console.error("Unexpected Gemini response:", JSON.stringify(data).slice(0, 300));
      throw new Error("No image data in response");
    }

    return NextResponse.json({
      image: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType || "image/png",
    });
  } catch (error: any) {
    console.error("Error generating infographic:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate infographic" },
      { status: 500 }
    );
  }
}
