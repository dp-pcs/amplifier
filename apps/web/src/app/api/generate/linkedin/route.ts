import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getUser } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, subtitle, url, description, isOwnArticle } = await req.json();

    // Fetch user to get their Gemini API key
    const user = await getUser(session.user.email);
    const apiKey = user?.geminiApiKey || process.env.GOOGLE_API_KEY || "";
    const genAI = new GoogleGenerativeAI(apiKey);

    if (!title || !url) {
      return NextResponse.json(
        { error: "title and url are required" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash-exp",
    });

    const perspective = isOwnArticle ? "first person" : "third person";

    const prompt = `Generate a compelling LinkedIn post in ${perspective} perspective.

Article Title: ${title}
${subtitle ? `Subtitle: ${subtitle}` : ""}
${description ? `Description: ${description}` : ""}
Article URL: ${url}

${
  isOwnArticle
    ? `Write as the author announcing their new article. Position it as thought leadership - share the key insight or problem you're solving. Be authentic and professional.`
    : `Write as someone recommending this article. Explain what you learned and why it matters. Share your perspective on the ideas presented.`
}

Requirements:
- 150-300 words
- Strong hook in the first line
- 3-5 bullet points OR 2-3 short paragraphs highlighting key insights
- Clear call-to-action at the end (e.g., "Read more:", "Check out the full article:")
- Include the article URL at the end
- 3-5 relevant hashtags at the very end
- Professional but conversational tone
- NOT generic or templated

Format:
[Hook line]

[Key insights as bullets or paragraphs]

[CTA + URL]

[Hashtags]

Return ONLY the LinkedIn post. No extra commentary.`;

    const result = await model.generateContent(prompt);
    const post = result.response.text().trim();

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Error generating LinkedIn post:", error);
    return NextResponse.json(
      { error: "Failed to generate LinkedIn post" },
      { status: 500 }
    );
  }
}
