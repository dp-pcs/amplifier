"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface UserSettings {
  substackHandle?: string;
  substackCookie?: string;
  trilogyHandle?: string;
  geminiApiKey?: string;
  linkedinHandle?: string;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings>({
    substackHandle: "",
    substackCookie: "",
    trilogyHandle: "",
    geminiApiKey: "",
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
          geminiApiKey: data.geminiApiKey || "",
          linkedinHandle: data.linkedinHandle || "",
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
          <p className="text-purple-200 mb-8">
            Configure your Substack and LinkedIn integrations
          </p>

          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="substackHandle"
                  className="block text-sm font-medium text-white mb-2"
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
                  className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <p className="mt-1 text-sm text-purple-200">
                  Your Substack publication slug (e.g., &quot;trilogyai&quot; from
                  trilogyai.substack.com)
                </p>
              </div>

              <div>
                <label
                  htmlFor="substackCookie"
                  className="block text-sm font-medium text-white mb-2"
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
                  className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 font-mono text-sm"
                  placeholder="Paste your connect.sid cookie value here"
                />
                <div className="mt-2 text-sm text-purple-200 space-y-1">
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
                  className="block text-sm font-medium text-white mb-2"
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
                  className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <p className="mt-1 text-sm text-purple-200">
                  Articles from this publication will be available in the article browser
                </p>
              </div>

              <div>
                <label
                  htmlFor="geminiApiKey"
                  className="block text-sm font-medium text-white mb-2"
                >
                  Gemini API Key
                </label>
                <input
                  type="password"
                  id="geminiApiKey"
                  value={settings.geminiApiKey}
                  onChange={(e) =>
                    setSettings({ ...settings, geminiApiKey: e.target.value })
                  }
                  placeholder="AIza..."
                  className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <div className="mt-2 text-sm text-purple-200">
                  <p>Get a free key at{" "}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-white transition-colors"
                    >
                      aistudio.google.com →
                    </a>
                  </p>
                  <p className="mt-1">Used for generating notes and infographics</p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="linkedinHandle"
                  className="block text-sm font-medium text-white mb-2"
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
                  className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <p className="mt-1 text-sm text-purple-200">
                  Your LinkedIn profile handle for display
                </p>
              </div>

              {message && (
                <div
                  className={`p-4 rounded-lg ${
                    message.type === "success"
                      ? "bg-green-500/20 border border-green-500/50 text-green-100"
                      : "bg-red-500/20 border border-red-500/50 text-red-100"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </form>
          </div>

          <div className="mt-6 text-center">
            <a
              href="/dashboard"
              className="text-purple-200 hover:text-white transition-colors"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
