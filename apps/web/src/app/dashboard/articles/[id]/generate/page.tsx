"use client";

import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

interface Article {
  id: number;
  title: string;
  subtitle: string | null;
  date: string;
  url: string;
  description: string | null;
  coverImage: string | null;
  handle?: string;
}

type TabType = "note" | "linkedin" | "infographic";

export default function GeneratePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("note");
  const [isOwnArticle, setIsOwnArticle] = useState(false);
  const [userHandle, setUserHandle] = useState<string | null>(null);
  const [trilogyHandle, setTrilogyHandle] = useState<string | null>(null);
  const [postToTrilogy, setPostToTrilogy] = useState(false);

  // Generation states
  const [noteContent, setNoteContent] = useState("");
  const [linkedinContent, setLinkedinContent] = useState("");
  const [infographicData, setInfographicData] = useState<{
    image: string;
    mimeType: string;
  } | null>(null);

  const [generating, setGenerating] = useState(false);
  const [posting, setPosting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCampaignId, setSavedCampaignId] = useState<string | null>(null);
  const [needsAiKey, setNeedsAiKey] = useState(false);

  const articleId = params.id as string;

  useEffect(() => {
    // Fetch user settings to get their Substack handle and org handle
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.substackHandle) {
          setUserHandle(data.substackHandle);
        }
        if (data.trilogyHandle) {
          setTrilogyHandle(data.trilogyHandle);
        }
      })
      .catch((err) => console.error("Failed to fetch user settings:", err));

    // Try to get article from sessionStorage first (for quick navigation)
    const cached = sessionStorage.getItem(`article_${articleId}`);
    if (cached) {
      try {
        const parsedArticle = JSON.parse(cached);
        setArticle(parsedArticle);
        setLoading(false);

        // Check if this is the user's own article
        if (parsedArticle.handle && userHandle) {
          setIsOwnArticle(parsedArticle.handle === userHandle);
        }
        return;
      } catch (e) {
        console.error("Failed to parse cached article:", e);
      }
    }

    // Otherwise, use URL params if available
    const title = searchParams.get("title");
    const url = searchParams.get("url");
    const handle = searchParams.get("handle");

    if (title && url) {
      const articleFromParams: Article = {
        id: parseInt(articleId),
        title,
        subtitle: searchParams.get("subtitle"),
        date: searchParams.get("date") || new Date().toISOString(),
        url,
        description: searchParams.get("description"),
        coverImage: searchParams.get("coverImage"),
        handle: handle || undefined,
      };
      setArticle(articleFromParams);

      // Check if this is the user's own article
      if (handle && userHandle) {
        setIsOwnArticle(handle === userHandle);
      }
    }

    setLoading(false);
  }, [articleId, searchParams, userHandle]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleGenerate = async () => {
    if (!article) return;

    setGenerating(true);
    setError(null);

    try {
      let endpoint = "";
      let setter: (value: any) => void = () => {};

      switch (activeTab) {
        case "note":
          endpoint = "/api/generate/note";
          setter = (data) => setNoteContent(data.note);
          break;
        case "linkedin":
          endpoint = "/api/generate/linkedin";
          setter = (data) => setLinkedinContent(data.post);
          break;
        case "infographic":
          endpoint = "/api/generate/infographic";
          setter = (data) =>
            setInfographicData({ image: data.image, mimeType: data.mimeType });
          break;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: article.title,
          subtitle: article.subtitle,
          url: article.url,
          description: article.description,
          isOwnArticle,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Check for 402 Payment Required (AI key missing)
        if (response.status === 402 && errorData.error === "ai_key_required") {
          setNeedsAiKey(true);
          return;
        }

        throw new Error(errorData.error || "Failed to generate content");
      }

      const data = await response.json();
      setter(data);
      setNeedsAiKey(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate content");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    let textToCopy = "";
    switch (activeTab) {
      case "note":
        textToCopy = noteContent;
        break;
      case "linkedin":
        textToCopy = linkedinContent;
        break;
    }

    if (textToCopy) {
      await navigator.clipboard.writeText(textToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handlePostToSubstack = async () => {
    if (!noteContent) return;

    setPosting(true);
    setError(null);

    try {
      const targetHandle = postToTrilogy && trilogyHandle ? trilogyHandle : undefined;
      const response = await fetch("/api/substack/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: noteContent,
          targetHandle
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to post to Substack");
      }

      const publicationName = postToTrilogy && trilogyHandle
        ? trilogyHandle.charAt(0).toUpperCase() + trilogyHandle.slice(1)
        : "your Substack";
      alert(`Successfully posted to ${publicationName}!`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to post to Substack"
      );
    } finally {
      setPosting(false);
    }
  };

  const handleDownloadInfographic = () => {
    if (!infographicData) return;

    const link = document.createElement("a");
    link.href = `data:${infographicData.mimeType};base64,${infographicData.image}`;
    link.download = `infographic-${article?.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRegenerate = () => {
    // Clear current content and regenerate
    switch (activeTab) {
      case "note":
        setNoteContent("");
        break;
      case "linkedin":
        setLinkedinContent("");
        break;
      case "infographic":
        setInfographicData(null);
        break;
    }
    handleGenerate();
  };

  const handleSaveCampaign = async () => {
    if (!article) return;

    setSaving(true);
    setError(null);

    try {
      const assets: any[] = [];

      if (noteContent) {
        assets.push({
          id: crypto.randomUUID(),
          type: "note",
          content: noteContent,
          status: "draft",
          createdAt: new Date().toISOString(),
        });
      }

      if (linkedinContent) {
        assets.push({
          id: crypto.randomUUID(),
          type: "linkedin",
          content: linkedinContent,
          status: "draft",
          createdAt: new Date().toISOString(),
        });
      }

      if (infographicData) {
        assets.push({
          id: crypto.randomUUID(),
          type: "infographic",
          content: infographicData.image,
          status: "draft",
          createdAt: new Date().toISOString(),
        });
      }

      if (assets.length === 0) {
        setError("Generate some content before saving the campaign");
        return;
      }

      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleUrl: article.url,
          articleTitle: article.title,
          articleHandle: article.handle || "unknown",
          isOwnArticle,
          assets,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save campaign");
      }

      const campaign = await response.json();
      setSavedCampaignId(campaign.campaignId);

      // Redirect to campaigns page after a brief delay
      setTimeout(() => {
        router.push("/dashboard/campaigns");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save campaign");
    } finally {
      setSaving(false);
    }
  };

  const hasGeneratedContent = Boolean(
    noteContent || linkedinContent || infographicData
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading article...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <button
          onClick={() => router.push("/dashboard/articles")}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Articles
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel - Article info */}
          <div className="lg:col-span-1">
            {article ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
                {article.coverImage && (
                  <div className="aspect-video w-full overflow-hidden rounded-lg bg-gray-100 mb-4">
                    <img
                      src={article.coverImage}
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {article.title}
                </h2>
                {article.subtitle && (
                  <p className="text-sm text-gray-600 mb-3">
                    {article.subtitle}
                  </p>
                )}
                <p className="text-xs text-gray-500 mb-3">
                  Published {formatDate(article.date)}
                </p>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-purple-600 hover:text-purple-700"
                >
                  View original article
                  <svg
                    className="w-3 h-3 ml-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>

                {/* Is this your article toggle */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isOwnArticle}
                      onChange={(e) => setIsOwnArticle(e.target.checked)}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      This is my article
                    </span>
                  </label>
                  <p className="mt-2 text-xs text-gray-500">
                    {isOwnArticle
                      ? "Content will be written in 1st person"
                      : "Content will be written in 3rd person"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Article #{articleId}
                </h2>
                <p className="text-sm text-gray-600">
                  Selected article for content generation
                </p>
              </div>
            )}
          </div>

          {/* Right panel - Generation tabs */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab("note")}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === "note"
                        ? "border-purple-600 text-purple-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Substack Note
                  </button>
                  <button
                    onClick={() => setActiveTab("linkedin")}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === "linkedin"
                        ? "border-purple-600 text-purple-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    LinkedIn Post
                  </button>
                  <button
                    onClick={() => setActiveTab("infographic")}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === "infographic"
                        ? "border-purple-600 text-purple-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Infographic
                  </button>
                </nav>
              </div>

              {/* Tab content */}
              <div className="p-6">
                {needsAiKey && (
                  <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
                    <svg
                      className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm text-yellow-800">
                        Add your AI provider key in Settings to generate notes and posts{" "}
                        <a
                          href="/dashboard/settings"
                          className="font-medium underline hover:text-yellow-900"
                        >
                          Go to Settings
                        </a>
                      </p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {savedCampaignId && (
                  <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800">
                      Campaign saved! Redirecting to campaigns...
                    </p>
                  </div>
                )}

                {/* Substack Note Tab */}
                {activeTab === "note" && (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Substack Note
                      </h3>
                      <p className="text-sm text-gray-600">
                        Generate a concise Substack Note (max 280 characters) to
                        promote this article.
                      </p>
                    </div>

                    {noteContent ? (
                      <>
                        <textarea
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                          placeholder="Generated note will appear here..."
                        />
                        <div className="mt-2 text-xs text-gray-500">
                          {noteContent.length} / 280 characters
                        </div>

                        {/* Post to Trilogy AI checkbox */}
                        {trilogyHandle && article?.handle === trilogyHandle && (
                          <div className="mt-4">
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={postToTrilogy}
                                onChange={(e) => setPostToTrilogy(e.target.checked)}
                                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">
                                Post notes to {trilogyHandle.charAt(0).toUpperCase() + trilogyHandle.slice(1)} Substack instead of my personal Substack
                              </span>
                            </label>
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            onClick={handleCopy}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            {copySuccess ? "Copied!" : "Copy to Clipboard"}
                          </button>
                          <button
                            onClick={handlePostToSubstack}
                            disabled={posting}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {posting ? "Posting..." : "Post to Substack"}
                          </button>
                          <button
                            onClick={handleRegenerate}
                            disabled={generating}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Regenerate
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={handleGenerate}
                        disabled={generating || !article}
                        className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {generating ? (
                          <>
                            <svg
                              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Generating...
                          </>
                        ) : (
                          "Generate Note"
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* LinkedIn Tab */}
                {activeTab === "linkedin" && (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        LinkedIn Post
                      </h3>
                      <p className="text-sm text-gray-600">
                        Generate a professional LinkedIn post (150-300 words) to
                        share this article.
                      </p>
                    </div>

                    {linkedinContent ? (
                      <>
                        <textarea
                          value={linkedinContent}
                          onChange={(e) => setLinkedinContent(e.target.value)}
                          className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none font-mono text-sm"
                          placeholder="Generated post will appear here..."
                        />

                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            onClick={handleCopy}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            {copySuccess ? "Copied!" : "Copy to Clipboard"}
                          </button>
                          <button
                            onClick={handleRegenerate}
                            disabled={generating}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Regenerate
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={handleGenerate}
                        disabled={generating || !article}
                        className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {generating ? (
                          <>
                            <svg
                              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Generating...
                          </>
                        ) : (
                          "Generate LinkedIn Post"
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Infographic Tab */}
                {activeTab === "infographic" && (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Infographic
                      </h3>
                      <p className="text-sm text-gray-600">
                        Generate a LinkedIn-ready infographic highlighting key
                        takeaways from the article.
                      </p>
                    </div>

                    {infographicData ? (
                      <>
                        <div className="border border-gray-300 rounded-lg overflow-hidden mb-4">
                          <img
                            src={`data:${infographicData.mimeType};base64,${infographicData.image}`}
                            alt="Generated infographic"
                            className="w-full"
                          />
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={handleDownloadInfographic}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                          >
                            Download Infographic
                          </button>
                          <button
                            onClick={handleRegenerate}
                            disabled={generating}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Regenerate
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={handleGenerate}
                        disabled={generating || !article}
                        className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {generating ? (
                          <>
                            <svg
                              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Generating...
                          </>
                        ) : (
                          "Generate Infographic"
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Save to Campaign button */}
              {hasGeneratedContent && !savedCampaignId && (
                <div className="px-6 pb-6">
                  <button
                    onClick={handleSaveCampaign}
                    disabled={saving}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {saving ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Saving Campaign...
                      </>
                    ) : (
                      "Save to Campaign"
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
