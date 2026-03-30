"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AI_PROVIDERS } from "@/lib/ai-providers";

interface UserSettings {
  substackHandle?: string;
  substackCookie?: string;
  trilogyHandle?: string;
  aiProvider?: string;
  aiBaseUrl?: string;
  aiApiKey?: string;
  aiModel?: string;
  linkedinHandle?: string;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings>({
    substackHandle: "",
    substackCookie: "",
    trilogyHandle: "",
    aiProvider: "gemini",
    aiBaseUrl: "",
    aiApiKey: "",
    aiModel: "",
    linkedinHandle: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchSettings();
    }
  }, [status]);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings({
          substackHandle: data.substackHandle || "",
          substackCookie: data.substackCookie || "",
          trilogyHandle: data.trilogyHandle || "",
          aiProvider: data.aiProvider || "gemini",
          aiBaseUrl: data.aiBaseUrl || "",
          aiApiKey: data.aiApiKey || "",
          aiModel: data.aiModel || "",
          linkedinHandle: data.linkedinHandle || "",
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (providerId: string) => {
    const provider = AI_PROVIDERS.find((p) => p.id === providerId);
    if (provider) {
      setSettings({
        ...settings,
        aiProvider: providerId,
        aiBaseUrl: provider.baseUrl,
        aiModel: provider.defaultModel,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Settings saved successfully!" });
      } else {
        const error = await response.json();
        setMessage({
          type: "error",
          text: error.message || "Failed to save settings",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred while saving" });
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFC" }}>
        <div className="text-xl" style={{ color: "#475569" }}>Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC" }}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-2" style={{ color: "#0F172A" }}>Settings</h1>
          <p className="mb-8" style={{ color: "#475569" }}>
            Configure your Substack and LinkedIn integrations
          </p>

          <div className="rounded-lg p-6 border" style={{ background: "#FFFFFF", borderColor: "#E2E8F0" }}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="substackHandle"
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#0F172A" }}
                >
                  Substack Handle
                </label>
                <input
                  type="text"
                  id="substackHandle"
                  value={settings.substackHandle}
                  onChange={(e) =>
                    setSettings({ ...settings, substackHandle: e.target.value })
                  }
                  placeholder="trilogyai"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1"
                  style={{ borderColor: "#E2E8F0", color: "#0F172A" }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#2563EB";
                    e.target.style.boxShadow = "0 0 0 1px #2563EB";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#E2E8F0";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <p className="mt-1 text-sm" style={{ color: "#94A3B8" }}>
                  Your Substack publication slug (e.g., &quot;trilogyai&quot; from
                  trilogyai.substack.com)
                </p>
              </div>

              <div>
                <label
                  htmlFor="substackCookie"
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#0F172A" }}
                >
                  Substack Cookie
                </label>
                <textarea
                  id="substackCookie"
                  value={settings.substackCookie}
                  onChange={(e) =>
                    setSettings({ ...settings, substackCookie: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md font-mono text-sm focus:outline-none focus:ring-1"
                  style={{ borderColor: "#E2E8F0", color: "#0F172A" }}
                  placeholder="Paste your connect.sid cookie value here"
                  onFocus={(e) => {
                    e.target.style.borderColor = "#2563EB";
                    e.target.style.boxShadow = "0 0 0 1px #2563EB";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#E2E8F0";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <div className="mt-2 text-sm space-y-1" style={{ color: "#94A3B8" }}>
                  <p className="font-medium">How to find your Substack cookie:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Open Substack in your browser and sign in</li>
                    <li>Open DevTools (F12 or right-click → Inspect)</li>
                    <li>Go to Application tab → Cookies</li>
                    <li>Find and copy the value of &quot;connect.sid&quot;</li>
                  </ol>
                </div>
              </div>

              <div>
                <label
                  htmlFor="trilogyHandle"
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#0F172A" }}
                >
                  Organization Substack Handle
                </label>
                <input
                  type="text"
                  id="trilogyHandle"
                  value={settings.trilogyHandle}
                  onChange={(e) =>
                    setSettings({ ...settings, trilogyHandle: e.target.value })
                  }
                  placeholder="trilogyai"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1"
                  style={{ borderColor: "#E2E8F0", color: "#0F172A" }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#2563EB";
                    e.target.style.boxShadow = "0 0 0 1px #2563EB";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#E2E8F0";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <p className="mt-1 text-sm" style={{ color: "#94A3B8" }}>
                  Articles from this publication will be available in the article browser
                </p>
              </div>

              <div className="space-y-4 p-4 rounded-lg border" style={{ background: "#F8FAFC", borderColor: "#E2E8F0" }}>
                <h3 className="text-lg font-semibold" style={{ color: "#0F172A" }}>
                  AI Provider for Content Generation
                </h3>

                <div>
                  <label
                    htmlFor="aiProvider"
                    className="block text-sm font-medium mb-2"
                    style={{ color: "#0F172A" }}
                  >
                    Provider
                  </label>
                  <select
                    id="aiProvider"
                    value={settings.aiProvider}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1"
                    style={{ borderColor: "#E2E8F0", color: "#0F172A", background: "#FFFFFF" }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#2563EB";
                      e.target.style.boxShadow = "0 0 0 1px #2563EB";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#E2E8F0";
                      e.target.style.boxShadow = "none";
                    }}
                  >
                    {AI_PROVIDERS.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="aiApiKey"
                    className="block text-sm font-medium mb-2"
                    style={{ color: "#0F172A" }}
                  >
                    API Key
                  </label>
                  <input
                    type="password"
                    id="aiApiKey"
                    value={settings.aiApiKey}
                    onChange={(e) =>
                      setSettings({ ...settings, aiApiKey: e.target.value })
                    }
                    placeholder="Paste your API key here"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1"
                    style={{ borderColor: "#E2E8F0", color: "#0F172A" }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#2563EB";
                      e.target.style.boxShadow = "0 0 0 1px #2563EB";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#E2E8F0";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="aiModel"
                    className="block text-sm font-medium mb-2"
                    style={{ color: "#0F172A" }}
                  >
                    Model
                  </label>
                  <input
                    type="text"
                    id="aiModel"
                    value={settings.aiModel}
                    onChange={(e) =>
                      setSettings({ ...settings, aiModel: e.target.value })
                    }
                    placeholder="Model name"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1"
                    style={{ borderColor: "#E2E8F0", color: "#0F172A" }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#2563EB";
                      e.target.style.boxShadow = "0 0 0 1px #2563EB";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#E2E8F0";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>

                {settings.aiProvider === "custom" && (
                  <div>
                    <label
                      htmlFor="aiBaseUrl"
                      className="block text-sm font-medium mb-2"
                      style={{ color: "#0F172A" }}
                    >
                      Base URL
                    </label>
                    <input
                      type="text"
                      id="aiBaseUrl"
                      value={settings.aiBaseUrl}
                      onChange={(e) =>
                        setSettings({ ...settings, aiBaseUrl: e.target.value })
                      }
                      placeholder="https://api.example.com/v1"
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1"
                      style={{ borderColor: "#E2E8F0", color: "#0F172A" }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#2563EB";
                        e.target.style.boxShadow = "0 0 0 1px #2563EB";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#E2E8F0";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                  </div>
                )}

                <div className="text-sm" style={{ color: "#475569" }}>
                  <p>
                    Get your API key →{" "}
                    {settings.aiProvider === "gemini" && (
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline transition-colors"
                        style={{ color: "#2563EB" }}
                      >
                        Google AI Studio
                      </a>
                    )}
                    {settings.aiProvider === "claude" && (
                      <a
                        href="https://console.anthropic.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline transition-colors"
                        style={{ color: "#2563EB" }}
                      >
                        Anthropic Console
                      </a>
                    )}
                    {settings.aiProvider === "openai" && (
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline transition-colors"
                        style={{ color: "#2563EB" }}
                      >
                        OpenAI Platform
                      </a>
                    )}
                    {settings.aiProvider === "groq" && (
                      <a
                        href="https://console.groq.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline transition-colors"
                        style={{ color: "#2563EB" }}
                      >
                        Groq Console
                      </a>
                    )}
                    {settings.aiProvider === "kimi" && (
                      <a
                        href="https://platform.moonshot.cn/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline transition-colors"
                        style={{ color: "#2563EB" }}
                      >
                        Kimi Platform
                      </a>
                    )}
                    {settings.aiProvider === "deepseek" && (
                      <a
                        href="https://platform.deepseek.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline transition-colors"
                        style={{ color: "#2563EB" }}
                      >
                        DeepSeek Platform
                      </a>
                    )}
                    {settings.aiProvider === "custom" && (
                      <span>Contact your provider for API credentials</span>
                    )}
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="linkedinHandle"
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#0F172A" }}
                >
                  LinkedIn Handle (Optional)
                </label>
                <input
                  type="text"
                  id="linkedinHandle"
                  value={settings.linkedinHandle}
                  onChange={(e) =>
                    setSettings({ ...settings, linkedinHandle: e.target.value })
                  }
                  placeholder="yourprofile"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1"
                  style={{ borderColor: "#E2E8F0", color: "#0F172A" }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#2563EB";
                    e.target.style.boxShadow = "0 0 0 1px #2563EB";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#E2E8F0";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <p className="mt-1 text-sm" style={{ color: "#94A3B8" }}>
                  Your LinkedIn profile handle for display
                </p>
              </div>

              {message && (
                <div
                  className="p-4 rounded-lg border"
                  style={
                    message.type === "success"
                      ? { background: "#F0FDF4", borderColor: "#16A34A", color: "#166534" }
                      : { background: "#FEF2F2", borderColor: "#DC2626", color: "#991B1B" }
                  }
                >
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white"
                style={{ background: "#2563EB" }}
                onMouseEnter={(e) => {
                  if (!saving) e.currentTarget.style.background = "#1D4ED8";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#2563EB";
                }}
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </form>
          </div>

          <div className="mt-6 text-center">
            <a
              href="/dashboard"
              className="transition-colors"
              style={{ color: "#2563EB" }}
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
