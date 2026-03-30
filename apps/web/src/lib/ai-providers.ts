export interface AIProvider {
  id: string;
  label: string;
  baseUrl: string;
  defaultModel: string;
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: "gemini",
    label: "Gemini (Google)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.0-flash"
  },
  {
    id: "claude",
    label: "Claude (Anthropic)",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-5-haiku-20241022"
  },
  {
    id: "openai",
    label: "GPT-4 (OpenAI)",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini"
  },
  {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile"
  },
  {
    id: "kimi",
    label: "Kimi Moonshot",
    baseUrl: "https://api.moonshot.cn/v1",
    defaultModel: "moonshot-v1-8k"
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat"
  },
  {
    id: "custom",
    label: "Custom",
    baseUrl: "",
    defaultModel: ""
  },
];
