import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

// gemini-3-pro-image-preview = "Nano Banana Pro" — generateContent with IMAGE modality
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image-preview";

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

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: IMAGE_MODEL });

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

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] } as any,
    });

    const parts = result.response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/")) as any;

    if (!imagePart?.inlineData) {
      throw new Error("No image generated");
    }

    return NextResponse.json({
      image: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType || "image/jpeg",
    });
  } catch (error: any) {
    console.error("Error generating infographic:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate infographic" },
      { status: 500 }
    );
  }
}
