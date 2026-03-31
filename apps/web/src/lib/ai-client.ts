import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export function getAiClient(baseUrl: string, apiKey: string) {
  return new OpenAI({ baseURL: baseUrl, apiKey });
}

function isAnthropicUrl(baseUrl: string): boolean {
  return baseUrl.includes("api.anthropic.com");
}

export async function generateText(
  prompt: string,
  systemPrompt: string,
  config: { baseUrl: string; apiKey: string; model: string; maxTokens?: number }
): Promise<string> {
  try {
    if (isAnthropicUrl(config.baseUrl)) {
      const client = new Anthropic({ apiKey: config.apiKey });
      const response = await client.messages.create({
        model: config.model,
        max_tokens: config.maxTokens ?? 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
      });
      const block = response.content[0];
      return block.type === "text" ? block.text : "";
    }

    const client = getAiClient(config.baseUrl, config.apiKey);
    const response = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: config.maxTokens ?? 1024,
    });
    return response.choices[0]?.message?.content ?? "";
  } catch (err: any) {
    // Surface the provider's error message so callers can return it to the user
    const providerMessage =
      err?.error?.message ||
      err?.message ||
      "Unknown error from AI provider";
    throw new Error(providerMessage);
  }
}
