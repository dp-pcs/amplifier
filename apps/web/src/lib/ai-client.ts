import OpenAI from "openai";

export function getAiClient(baseUrl: string, apiKey: string) {
  return new OpenAI({ baseURL: baseUrl, apiKey });
}

export async function generateText(
  prompt: string,
  systemPrompt: string,
  config: { baseUrl: string; apiKey: string; model: string }
): Promise<string> {
  const client = getAiClient(config.baseUrl, config.apiKey);
  const response = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ],
    max_tokens: 1024,
  });
  return response.choices[0]?.message?.content ?? "";
}
