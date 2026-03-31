import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUser } from "@/lib/db";
import { generateText } from "@/lib/ai-client";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, subtitle, url, description, isOwnArticle } = await req.json();

    if (!title || !url) {
      return NextResponse.json(
        { error: "title and url are required" },
        { status: 400 }
      );
    }

    // Fetch user to get their AI settings
    const user = await getUser(session.user.email);

    if (!user?.aiApiKey || !user?.aiBaseUrl || !user?.aiModel) {
      return NextResponse.json(
        {
          error: "ai_key_required",
          message: "Add your AI provider key in Settings to generate notes"
        },
        { status: 402 }
      );
    }

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

    const systemPrompt = "You are a helpful assistant that generates engaging Substack Notes.";

    const note = await generateText(prompt, systemPrompt, {
      baseUrl: user.aiBaseUrl,
      apiKey: user.aiApiKey,
      model: user.aiModel,
    });

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
  } catch (error: any) {
    console.error("Error generating Substack note:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate note" },
      { status: 500 }
    );
  }
}
