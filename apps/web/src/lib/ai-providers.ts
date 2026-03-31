export interface AIProvider {
  id: string;
  label: string;
  baseUrl: string;
  defaultModel: string;
  models: Array<{ id: string; label: string }>;
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: "gemini",
    label: "Gemini (Google)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.0-flash",
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    ],
  },
  {
    id: "claude",
    label: "Claude (Anthropic)",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-5-sonnet-20241022",
    models: [
      { id: "claude-opus-4-5", label: "Claude Opus 4.5" },
      { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
      { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
      { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku (fast)" },
      { id: "claude-3-opus-20240229", label: "Claude 3 Opus" },
    ],
  },
  {
    id: "openai",
    label: "GPT-4 (OpenAI)",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
    models: [
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4o-mini", label: "GPT-4o Mini (fast)" },
      { id: "gpt-4-turbo", label: "GPT-4 Turbo" },
      { id: "o1-mini", label: "o1 Mini" },
    ],
  },
  {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B (fast)" },
      { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
      { id: "gemma2-9b-it", label: "Gemma 2 9B" },
    ],
  },
  {
    id: "kimi",
    label: "Kimi Moonshot",
    baseUrl: "https://api.moonshot.cn/v1",
    defaultModel: "moonshot-v1-8k",
    models: [
      { id: "moonshot-v1-8k", label: "Moonshot v1 8K" },
      { id: "moonshot-v1-32k", label: "Moonshot v1 32K" },
      { id: "moonshot-v1-128k", label: "Moonshot v1 128K" },
    ],
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    models: [
      { id: "deepseek-chat", label: "DeepSeek Chat" },
      { id: "deepseek-reasoner", label: "DeepSeek Reasoner" },
    ],
  },
  {
    id: "custom",
    label: "Custom",
    baseUrl: "",
    defaultModel: "",
    models: [],
  },
];
