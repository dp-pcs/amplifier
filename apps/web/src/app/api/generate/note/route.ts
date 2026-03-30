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
    const action = isOwnArticle
      ? "I just published"
      : "Check out this great piece";

    const prompt = `Generate a compelling Substack Note (max 280 characters) in ${perspective} perspective.

Article Title: ${title}
${subtitle ? `Subtitle: ${subtitle}` : ""}
${description ? `Description: ${description}` : ""}
Article URL: ${url}

${
  isOwnArticle
    ? `Write as the author announcing their new article. Start with something like "I just published..." or "New post:". Be enthusiastic but not generic.`
    : `Write as someone recommending this article. Start with something like "Check out this great piece..." or "Really enjoyed reading...". Explain why it's valuable.`
}

Requirements:
- Max 280 characters total (including the URL)
- Include the article URL
- Engaging and conversational tone
- NOT generic or templated
- Must be concise and punchy

Return ONLY the note text with the URL included. No extra commentary.`;

    const result = await model.generateContent(prompt);
    const note = result.response.text().trim();

    // Ensure the note includes the URL
    let finalNote = note;
    if (!note.includes(url)) {
      // If URL not included, append it
      if (note.length + url.length + 2 > 280) {
        // Truncate the note to fit
        const maxLength = 280 - url.length - 4; // 4 for "\n\n" + some buffer
        finalNote = note.substring(0, maxLength).trim() + "... " + url;
      } else {
        finalNote = note + "\n\n" + url;
      }
    }

    // Final length check
    if (finalNote.length > 280) {
      return NextResponse.json(
        {
          error: "Generated note exceeds 280 characters",
          note: finalNote,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ note: finalNote });
  } catch (error) {
    console.error("Error generating Substack note:", error);
    return NextResponse.json(
      { error: "Failed to generate note" },
      { status: 500 }
    );
  }
}
