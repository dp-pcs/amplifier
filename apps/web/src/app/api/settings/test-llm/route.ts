import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateText } from "@/lib/ai-client";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { baseUrl, apiKey, model } = await request.json();

    if (!baseUrl || !apiKey || !model) {
      return NextResponse.json(
        { error: "Missing required fields: baseUrl, apiKey, and model" },
        { status: 400 }
      );
    }

    // Make a simple test call with a short timeout
    const testPrompt = "Hello! Please respond with just 'OK' to confirm you're working.";
    const systemPrompt = "You are a helpful AI assistant. Respond concisely.";

    const response = await generateText(testPrompt, systemPrompt, {
      baseUrl,
      apiKey,
      model,
      maxTokens: 50,
    });

    return NextResponse.json({
      success: true,
      message: "Connection successful!",
      response: response.trim(),
    });
  } catch (error: any) {
    console.error("LLM test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to connect to the LLM provider",
      },
      { status: 500 }
    );
  }
}
