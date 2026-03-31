import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image-preview";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description, url } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY || "";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL });

    const prompt = `Create a professional LinkedIn-ready infographic for an article.

Article Title: ${title}
${description ? `Description: ${description}` : ""}
${url ? `URL: ${url}` : ""}

Design specifications:
- Dark background (deep navy or charcoal, #0F0F1A)
- Modern, tech-forward aesthetic
- Purple accent colors (#9333EA or similar)
- Title prominently displayed at the top in large, bold text
- 3 key takeaways presented in distinct numbered sections
- Clean, minimal design with plenty of white space
- Professional typography
- URL/attribution at the bottom in smaller text
- LinkedIn post dimensions (1200x627px landscape)
- High contrast for readability

Style: Modern, professional, tech industry aesthetic. Return ONLY the image.`;

    const result = await model.generateContent([{ text: prompt }]);

    // Find inline image data in response parts
    const parts = result.response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find(
      (p: any) => p.inlineData && p.inlineData.mimeType?.startsWith("image/")
    ) as any;

    if (!imagePart?.inlineData) {
      console.error("No image in response. Parts:", JSON.stringify(parts.map((p: any) => Object.keys(p))));
      throw new Error("No image generated");
    }

    return NextResponse.json({
      image: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType || "image/png",
    });
  } catch (error) {
    console.error("Error generating infographic:", error);
    return NextResponse.json(
      { error: "Failed to generate infographic" },
      { status: 500 }
    );
  }
}
