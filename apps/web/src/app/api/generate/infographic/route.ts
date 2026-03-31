import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description, url } = await req.json();

    // Use server API key for infographic generation
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Infographic generation is not configured on this server" },
        { status: 503 }
      );
    }
    const genAI = new GoogleGenerativeAI(apiKey);

    if (!title) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_IMAGE_MODEL || "imagen-3.0-generate-001",
    });

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

    const result = await model.generateContent(prompt);

    // Get the image data from the response
    const image = result.response.candidates?.[0]?.content?.parts?.[0];

    if (!image || !('inlineData' in image) || !image.inlineData) {
      throw new Error("No image generated");
    }

    const base64Image = image.inlineData.data;
    const mimeType = image.inlineData.mimeType;

    return NextResponse.json({
      image: base64Image,
      mimeType: mimeType || "image/png",
    });
  } catch (error: any) {
    console.error("Error generating infographic:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate infographic" },
      { status: 500 }
    );
  }
}
