import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export function getAiClient(baseUrl: string, apiKey: string) {
  return new OpenAI({ baseURL: baseUrl, apiKey });
}

export async function generateText(
  prompt: string,
  systemPrompt: string,
  config: { baseUrl: string; apiKey: string; model: string; maxTokens?: number }
): Promise<string> {
  const maxTokens = config.maxTokens ?? 4096;

  // Anthropic requires its own SDK — OpenAI-compat endpoint doesn't support chat/completions
  if (config.baseUrl.includes("anthropic.com")) {
    const client = new Anthropic({ apiKey: config.apiKey });
    const response = await client.messages.create({
      model: config.model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });
    const block = response.content[0];
    return block.type === "text" ? block.text : "";
  }

  // All other providers (OpenAI, Gemini, Groq, DeepSeek, Kimi, custom) via OpenAI-compat
  const client = getAiClient(config.baseUrl, config.apiKey);
  const response = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    max_tokens: maxTokens,
  });
  return response.choices[0]?.message?.content ?? "";
}
