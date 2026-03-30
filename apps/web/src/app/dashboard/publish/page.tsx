"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface GeneratedAsset {
  type: "note" | "linkedin" | "infographic";
  content: string;
}

export default function PublishPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [publishNow, setPublishNow] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // State for publishing
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [postUrl, setPostUrl] = useState<string | null>(null);

  // State for amplification
  const [amplifying, setAmplifying] = useState(false);
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([]);
  const [amplificationError, setAmplificationError] = useState<string | null>(
    null
  );

  // State for cookie check
  const [hasCookie, setHasCookie] = useState(true);

  useEffect(() => {
    // Check if user has Substack cookie configured
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (!data.substackCookie) {
          setHasCookie(false);
        }
      })
      .catch((err) => console.error("Failed to check settings:", err));
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith(".md")) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setMarkdown(content);

        // Try to extract title from first heading
        const titleMatch = content.match(/^#\s+(.+)$/m);
        if (titleMatch && !title) {
          setTitle(titleMatch[1]);
        }
      };
      reader.readAsText(file);
    }
  };

  const handlePublish = async () => {
    if (!title || !markdown) {
      setPublishError("Please provide a title and content");
      return;
    }

    setPublishing(true);
    setPublishError(null);
    setPublishSuccess(false);

    try {
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, subtitle, markdown, publishNow }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.needsCookie) {
          setHasCookie(false);
        }
        throw new Error(data.error || "Failed to publish");
      }

      setPublishSuccess(true);
      setPostUrl(data.postUrl || data.draftUrl);

      // Start auto-amplification
      if (publishNow && data.postUrl) {
        await handleAmplification(data.postUrl);
      }
    } catch (error) {
      setPublishError(
        error instanceof Error ? error.message : "Failed to publish"
      );
    } finally {
      setPublishing(false);
    }
  };

  const handleAmplification = async (articleUrl: string) => {
    setAmplifying(true);
    setAmplificationError(null);
    const assets: GeneratedAsset[] = [];

    try {
      // Generate notes (5-7 notes)
      const noteResponse = await fetch("/api/generate/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleUrl, count: 5 }),
      });

      if (noteResponse.ok) {
        const noteData = await noteResponse.json();
        if (noteData.notes && Array.isArray(noteData.notes)) {
          noteData.notes.forEach((note: string) => {
            assets.push({ type: "note", content: note });
          });
        }
      }

      // Generate LinkedIn post
      const linkedinResponse = await fetch("/api/generate/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleUrl }),
      });

      if (linkedinResponse.ok) {
        const linkedinData = await linkedinResponse.json();
        if (linkedinData.post) {
          assets.push({ type: "linkedin", content: linkedinData.post });
        }
      }

      // Generate infographics (2-3)
      const infographicResponse = await fetch("/api/generate/infographic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleUrl, count: 2 }),
      });

      if (infographicResponse.ok) {
        const infographicData = await infographicResponse.json();
        if (infographicData.images && Array.isArray(infographicData.images)) {
          infographicData.images.forEach((img: { image: string }) => {
            assets.push({ type: "infographic", content: img.image });
          });
        }
      }

      setGeneratedAssets(assets);
    } catch (error) {
      setAmplificationError(
        error instanceof Error ? error.message : "Failed to generate content"
      );
    } finally {
      setAmplifying(false);
    }
  };

  const handleSaveCampaign = async () => {
    if (!postUrl || generatedAssets.length === 0) return;

    try {
      const campaignAssets = generatedAssets.map((asset) => ({
        id: crypto.randomUUID(),
        type: asset.type,
        content: asset.content,
        status: "draft" as const,
        createdAt: new Date().toISOString(),
      }));

      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleUrl: postUrl,
          articleTitle: title,
          articleHandle: "your-publication", // TODO: get from user settings
          isOwnArticle: true,
          assets: campaignAssets,
          status: "active",
        }),
      });

      if (response.ok) {
        router.push("/dashboard/campaigns");
      }
    } catch (error) {
      console.error("Failed to save campaign:", error);
    }
  };

  if (!hasCookie) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div
          className="p-6 rounded-lg border-l-4 mb-6"
          style={{ borderColor: "#F59E0B", background: "#FEF3C7" }}
        >
          <h2 className="text-lg font-semibold mb-2" style={{ color: "#92400E" }}>
            Substack Cookie Required
          </h2>
          <p style={{ color: "#78350F" }}>
            You need to add your Substack cookie in Settings before you can
            publish articles.
          </p>
          <button
            onClick={() => router.push("/dashboard/settings")}
            className="mt-4 px-4 py-2 rounded-lg font-semibold text-white"
            style={{ background: "#F59E0B" }}
          >
            Go to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2" style={{ color: "#0F1117" }}>
            Publish Article
          </h1>
          <p style={{ color: "#64748B" }}>
            Write or upload markdown content and publish directly to Substack
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Input */}
          <div className="lg:col-span-1">
            <div
              className="p-6 rounded-lg border"
              style={{ borderColor: "#E2E8F0", background: "#FFFFFF" }}
            >
              <h2 className="text-xl font-bold mb-4">Content Input</h2>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">
                  Article Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  style={{ borderColor: "#E2E8F0" }}
                  placeholder="Enter article title"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">
                  Subtitle (optional)
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  style={{ borderColor: "#E2E8F0" }}
                  placeholder="Enter subtitle"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">
                  Upload Markdown File
                </label>
                <input
                  type="file"
                  accept=".md"
                  onChange={handleFileUpload}
                  className="w-full px-4 py-2 border rounded-lg"
                  style={{ borderColor: "#E2E8F0" }}
                />
                {selectedFile && (
                  <p className="text-sm mt-2" style={{ color: "#64748B" }}>
                    Loaded: {selectedFile.name}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">
                  Markdown Content *
                </label>
                <textarea
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg font-mono text-sm"
                  style={{ borderColor: "#E2E8F0", minHeight: "300px" }}
                  placeholder="# Your Article Title&#10;&#10;Write your article content in markdown..."
                />
              </div>

              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={publishNow}
                    onChange={(e) => setPublishNow(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm font-semibold">Publish Now</span>
                </label>
                <p className="text-xs mt-1" style={{ color: "#64748B" }}>
                  {publishNow
                    ? "Article will be published immediately"
                    : "Article will be saved as a draft"}
                </p>
              </div>

              <button
                onClick={handlePublish}
                disabled={publishing || !title || !markdown}
                className="w-full px-6 py-3 rounded-lg font-semibold text-white disabled:opacity-50"
                style={{ background: "#8B5CF6" }}
              >
                {publishing
                  ? "Publishing..."
                  : publishNow
                  ? "Publish to Substack"
                  : "Save as Draft"}
              </button>

              {publishError && (
                <div
                  className="mt-4 p-3 rounded-lg"
                  style={{ background: "#FEE2E2", color: "#991B1B" }}
                >
                  {publishError}
                </div>
              )}

              {publishSuccess && (
                <div
                  className="mt-4 p-3 rounded-lg"
                  style={{ background: "#D1FAE5", color: "#065F46" }}
                >
                  Successfully {publishNow ? "published" : "saved as draft"}!
                  {postUrl && (
                    <a
                      href={postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-2 underline"
                    >
                      View on Substack →
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Center Panel: Preview */}
          <div className="lg:col-span-1">
            <div
              className="p-6 rounded-lg border"
              style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}
            >
              <h2 className="text-xl font-bold mb-4">Preview</h2>

              {title && (
                <div className="mb-6">
                  <h1 className="text-3xl font-bold mb-2">{title}</h1>
                  {subtitle && (
                    <p className="text-xl" style={{ color: "#64748B" }}>
                      {subtitle}
                    </p>
                  )}
                </div>
              )}

              {markdown ? (
                <div className="prose max-w-none">
                  <MarkdownPreview markdown={markdown} />
                </div>
              ) : (
                <p style={{ color: "#64748B" }}>
                  Enter content to see preview...
                </p>
              )}
            </div>
          </div>

          {/* Right Panel: Amplification */}
          <div className="lg:col-span-1">
            <div
              className="p-6 rounded-lg border"
              style={{ borderColor: "#E2E8F0", background: "#FFFFFF" }}
            >
              <h2 className="text-xl font-bold mb-4">Auto-Amplification</h2>

              {!publishSuccess ? (
                <p style={{ color: "#64748B" }}>
                  Content will be auto-generated after publishing
                </p>
              ) : amplifying ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4"></div>
                  <p style={{ color: "#64748B" }}>
                    Generating notes and infographics...
                  </p>
                </div>
              ) : generatedAssets.length > 0 ? (
                <div>
                  <div className="space-y-4 mb-6">
                    {generatedAssets
                      .filter((a) => a.type === "note")
                      .map((asset, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg border"
                          style={{ borderColor: "#E2E8F0" }}
                        >
                          <div className="flex items-center mb-2">
                            <span
                              className="text-xs font-semibold px-2 py-1 rounded"
                              style={{
                                background: "#DDD6FE",
                                color: "#5B21B6",
                              }}
                            >
                              Note
                            </span>
                          </div>
                          <p className="text-sm">{asset.content}</p>
                        </div>
                      ))}

                    {generatedAssets
                      .filter((a) => a.type === "linkedin")
                      .map((asset, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg border"
                          style={{ borderColor: "#E2E8F0" }}
                        >
                          <div className="flex items-center mb-2">
                            <span
                              className="text-xs font-semibold px-2 py-1 rounded"
                              style={{
                                background: "#DBEAFE",
                                color: "#1E40AF",
                              }}
                            >
                              LinkedIn
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">
                            {asset.content}
                          </p>
                        </div>
                      ))}

                    {generatedAssets
                      .filter((a) => a.type === "infographic")
                      .map((asset, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg border"
                          style={{ borderColor: "#E2E8F0" }}
                        >
                          <div className="flex items-center mb-2">
                            <span
                              className="text-xs font-semibold px-2 py-1 rounded"
                              style={{
                                background: "#FED7AA",
                                color: "#9A3412",
                              }}
                            >
                              Infographic
                            </span>
                          </div>
                          <img
                            src={asset.content}
                            alt="Generated infographic"
                            className="w-full rounded"
                          />
                        </div>
                      ))}
                  </div>

                  <button
                    onClick={handleSaveCampaign}
                    className="w-full px-6 py-3 rounded-lg font-semibold text-white"
                    style={{ background: "#10B981" }}
                  >
                    Save Campaign
                  </button>
                </div>
              ) : amplificationError ? (
                <div
                  className="p-3 rounded-lg"
                  style={{ background: "#FEE2E2", color: "#991B1B" }}
                >
                  {amplificationError}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Safe markdown preview component that renders markdown without using dangerouslySetInnerHTML
 */
function MarkdownPreview({ markdown }: { markdown: string }) {
  const lines = markdown.split("\n");
  const elements: React.ReactElement[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Headers
    if (line.startsWith("### ")) {
      elements.push(<h3 key={i}>{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i}>{line.slice(3)}</h2>);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={i}>{line.slice(2)}</h1>);
    }
    // Lists
    else if (line.match(/^[\s]*[-*+]\s+/)) {
      elements.push(<li key={i}>{line.replace(/^[\s]*[-*+]\s+/, "")}</li>);
    } else if (line.match(/^[\s]*\d+\.\s+/)) {
      elements.push(<li key={i}>{line.replace(/^[\s]*\d+\.\s+/, "")}</li>);
    }
    // Code blocks
    else if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i}>
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
    }
    // Regular text
    else if (line.trim()) {
      elements.push(<p key={i}>{line}</p>);
    }

    i++;
  }

  return <>{elements}</>;
}
