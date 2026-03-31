"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

interface Article {
  id: number;
  title: string;
  subtitle: string | null;
  date: string;
  url: string;
  description: string | null;
  coverImage: string | null;
  handle?: string;
  alsLinkedinUrl?: string | null;
  alsXUrl?: string | null;
}

interface CampaignItem {
  id: number;
  angle: string;
  keyInsight: string;
  tone?: string;
  dayToPost?: number;
  needsInfographic: boolean;
  infographicReason: string | null;
  infographicStyle?: string;
  substackNote: string;
  linkedinPost: string;
  infographic?: { url: string; s3Key?: string; mimeType: string; image?: string } | null;
  infographicLoading?: boolean;
  substackPosted?: boolean;
  substackPostedAt?: string;
  linkedinPosted?: boolean;
  linkedinPostedAt?: string;
  noteEdited?: boolean;
  postEdited?: boolean;
}

interface Analysis {
  articleSummary: string;
  totalAngles: number;
  items: CampaignItem[];
}

type ActiveContent = "note" | "linkedin";

export default function CampaignPage() {
  const router = useRouter();
  const params = useParams();
  const articleId = params.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [isOwnArticle, setIsOwnArticle] = useState(false);
  const [userHandle, setUserHandle] = useState<string | null>(null);
  const [trilogyHandle, setTrilogyHandle] = useState<string | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsAiKey, setNeedsAiKey] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveContent>("note");
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [generatingInfographics, setGeneratingInfographics] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [savedCampaignId, setSavedCampaignId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [postingId, setPostingId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        const uh = data.substackHandle || null;
        const th = data.trilogyHandle || null;
        if (uh) setUserHandle(uh);
        if (th) setTrilogyHandle(th);

        // Auto-check "My article" once we have handles
        const cached = sessionStorage.getItem(`article_${articleId}`);
        if (cached) {
          try {
            const a = JSON.parse(cached);
            setArticle(a);
            if (a.handle && (a.handle === uh || a.handle === th)) {
              setIsOwnArticle(true);
            }
          } catch {}
        }
      });
  }, [articleId]);

  useEffect(() => {
    if (article?.handle && (userHandle || trilogyHandle)) {
      setIsOwnArticle(article.handle === userHandle || article.handle === trilogyHandle);
    }
  }, [article, userHandle, trilogyHandle]);

  const handleAnalyze = async () => {
    if (!article) return;
    setAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const res = await fetch("/api/generate/analyze", {
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

      if (!res.ok) {
        const err = await res.json();
        if (res.status === 402 && err.error === "ai_key_required") {
          setNeedsAiKey(true);
          return;
        }
        throw new Error(err.error || "Failed to analyze");
      }

      const data = await res.json();
      setAnalysis(data);
      setExpandedItem(data.items[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze article");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateInfographics = async () => {
    if (!analysis || !article) return;
    setGeneratingInfographics(true);

    const toGenerate = analysis.items
      .filter(item => item.needsInfographic && !item.infographic)
      .map(item => ({
        id: item.id,
        angle: item.angle,
        keyInsight: item.keyInsight,
        articleTitle: article.title,
        url: article.url,
        infographicStyle: item.infographicStyle,
      }));

    if (!toGenerate.length) {
      setGeneratingInfographics(false);
      return;
    }

    // Mark all as loading
    setAnalysis(prev => prev ? {
      ...prev,
      items: prev.items.map(item =>
        item.needsInfographic ? { ...item, infographicLoading: true } : item
      ),
    } : prev);

    try {
      const res = await fetch("/api/generate/infographic-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: toGenerate }),
      });

      if (res.ok) {
        const data = await res.json();
        setAnalysis(prev => prev ? {
          ...prev,
          items: prev.items.map(item => {
            const result = data.results.find((r: any) => r.id === item.id);
            if (!result) return { ...item, infographicLoading: false };
            if (result.error) return { ...item, infographicLoading: false };
            return { ...item, infographicLoading: false, infographic: { url: result.url, s3Key: result.s3Key, mimeType: result.mimeType } };
          }),
        } : prev);
      }
    } catch (err) {
      setAnalysis(prev => prev ? {
        ...prev,
        items: prev.items.map(item => ({ ...item, infographicLoading: false })),
      } : prev);
    } finally {
      setGeneratingInfographics(false);
    }
  };

  const updateNote = (id: number, value: string) => {
    setAnalysis(prev => prev ? {
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, substackNote: value, noteEdited: true } : item),
    } : prev);
  };

  const updatePost = (id: number, value: string) => {
    setAnalysis(prev => prev ? {
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, linkedinPost: value, postEdited: true } : item),
    } : prev);
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const postToSubstack = async (item: CampaignItem) => {
    setPostingId(item.id);
    try {
      const res = await fetch("/api/substack/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: item.substackNote }),
      });
      const data = await res.json();
      if (res.ok && data.saved) {
        // Copy note text to clipboard
        try { await navigator.clipboard.writeText(data.content); } catch {}
        // Open Substack Notes in new tab
        window.open("https://substack.com/notes", "_blank");
        alert("Note copied to clipboard! Paste it into Substack Notes.");
      } else {
        alert("Failed to post: " + (data.error || "Unknown error"));
      }
    } catch {
      alert("Failed to post to Substack");
    } finally {
      setPostingId(null);
    }
  };

  const markLinkedInPosted = (item: CampaignItem) => {
    const postedAt = new Date().toISOString();
    setAnalysis(prev => prev ? {
      ...prev,
      items: prev.items.map(i => i.id === item.id ? { ...i, linkedinPosted: true, linkedinPostedAt: postedAt } : i),
    } : prev);
  };

  const downloadInfographic = (item: CampaignItem) => {
    if (!item.infographic?.url) return;
    const link = document.createElement("a");
    link.href = item.infographic.url;
    link.download = `infographic-${article?.id}-${item.id}.png`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveCampaign = async () => {
    if (!article || !analysis) return;
    setSavingCampaign(true);

    const assets: any[] = [];
    for (const item of analysis.items) {
      // Truncate content to stay well under DynamoDB's 400KB item limit
      const noteContent = item.substackNote.substring(0, 1000);
      const linkedinContent = item.linkedinPost.substring(0, 3000);

      assets.push({
        id: crypto.randomUUID(),
        type: "note",
        content: noteContent,
        angle: item.angle,
        dayToPost: item.dayToPost ?? null,
        tone: item.tone ?? null,
        status: item.substackPosted ? "posted" : "draft",
        postedAt: item.substackPostedAt ?? null,
        createdAt: new Date().toISOString(),
      });
      assets.push({
        id: crypto.randomUUID(),
        type: "linkedin",
        content: linkedinContent,
        angle: item.angle,
        dayToPost: item.dayToPost ?? null,
        tone: item.tone ?? null,
        status: item.linkedinPosted ? "posted" : "draft",
        postedAt: item.linkedinPostedAt ?? null,
        createdAt: new Date().toISOString(),
      });
      // Store S3 key reference — actual image lives in S3
      if (item.infographic) {
        assets.push({
          id: crypto.randomUUID(),
          type: "infographic",
          content: item.infographic.s3Key || item.infographic.url || `[infographic:${item.infographicStyle || "chart"}]`,
          angle: item.angle,
          status: "draft",
          createdAt: new Date().toISOString(),
        });
      }
    }

    try {
      const res = await fetch("/api/campaigns", {
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

      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error("Server returned an invalid response — the request may have timed out");
      }

      if (!res.ok) {
        throw new Error(data?.error || `Save failed (HTTP ${res.status})`);
      }

      setSavedCampaignId(data.campaignId);
      // Give user 2.5s to see the success message before redirecting
      setTimeout(() => router.push("/dashboard/campaigns"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save campaign");
    } finally {
      setSavingCampaign(false);
    }
  };

  const infographicItems = analysis?.items.filter(i => i.needsInfographic) ?? [];
  const generatedInfographics = infographicItems.filter(i => i.infographic);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <button
          onClick={() => router.push("/dashboard/articles")}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Articles
        </button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Campaign Generator</h1>
          <p className="text-gray-600 mt-1">
            AI analyzes your article and generates a full amplification campaign — multiple notes, LinkedIn posts, and infographics.
          </p>
        </div>

        {/* Article card */}
        {article && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6 flex gap-4 items-start">
            {article.coverImage && (
              <img src={article.coverImage} alt={article.title} className="w-24 h-16 object-cover rounded flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-gray-900 text-lg leading-tight">{article.title}</h2>
              {article.subtitle && <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{article.subtitle}</p>}
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">
                {article.url}
              </a>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOwnArticle}
                  onChange={e => setIsOwnArticle(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">My article</span>
              </label>
            </div>
          </div>
        )}

        {/* Error / needs key */}
        {needsAiKey && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              Add your AI provider key in{" "}
              <a href="/dashboard/settings" className="font-medium underline">Settings</a>{" "}
              to generate campaigns.
            </p>
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Analyze button */}
        {!analysis && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Generate Full Campaign</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              AI will analyze the article and create 4–8 unique angles with Substack Notes, LinkedIn posts, and infographic suggestions.
            </p>
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !article}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {analyzing ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Analyzing article...
                </>
              ) : "✨ Analyze & Generate Campaign"}
            </button>
          </div>
        )}

        {/* Results */}
        {analysis && (
          <div className="space-y-6">
            {/* Summary bar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500 font-medium uppercase tracking-wide mb-1">Article Summary</p>
                  <p className="text-gray-700 text-sm">{analysis.articleSummary}</p>
                </div>
                <div className="flex gap-6 text-center flex-shrink-0">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{analysis.items.length}</div>
                    <div className="text-xs text-gray-500">Angles</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{infographicItems.length}</div>
                    <div className="text-xs text-gray-500">Infographics</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{generatedInfographics.length}</div>
                    <div className="text-xs text-gray-500">Generated</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content type tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("note")}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === "note" ? "bg-blue-600 text-white" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"}`}
              >
                Substack Notes
              </button>
              <button
                onClick={() => setActiveTab("linkedin")}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === "linkedin" ? "bg-blue-600 text-white" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"}`}
              >
                LinkedIn Posts
              </button>
            </div>

            {/* Campaign items */}
            <div className="space-y-3">
              {analysis.items.map(item => (
                <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* Item header */}
                  <button
                    className="w-full text-left p-5 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                          #{item.id}
                        </span>
                        {item.dayToPost && (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-full">
                            Day {item.dayToPost}
                          </span>
                        )}
                        {item.tone && (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
                            {item.tone}
                          </span>
                        )}
                        {item.needsInfographic && (
                          <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                            {item.infographic ? "✓ Infographic ready" : `📊 ${item.infographicStyle || "infographic"}`}
                          </span>
                        )}
                        {item.substackPosted && (
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full" title={item.substackPostedAt ? `Posted ${new Date(item.substackPostedAt).toLocaleString()}` : ""}>
                            ✓ Substack
                          </span>
                        )}
                        {item.linkedinPosted && (
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full" title={item.linkedinPostedAt ? `Posted ${new Date(item.linkedinPostedAt).toLocaleString()}` : ""}>
                            ✓ LinkedIn
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900">{item.angle}</h3>
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{item.keyInsight}</p>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${expandedItem === item.id ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Expanded content */}
                  {expandedItem === item.id && (
                    <div className="border-t border-gray-100 p-5 space-y-5">

                      {/* Infographic suggestion */}
                      {item.needsInfographic && item.infographicReason && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800">
                          <span className="font-semibold">📊 Infographic recommended: </span>{item.infographicReason}
                        </div>
                      )}

                      {/* Substack Note */}
                      {activeTab === "note" && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-700">Substack Note</label>
                            <span className={`text-xs ${item.substackNote.length > 280 ? "text-red-500" : "text-gray-400"}`}>
                              {item.substackNote.length} / 280
                            </span>
                          </div>
                          <textarea
                            value={item.substackNote}
                            onChange={e => updateNote(item.id, e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          />
                          <div className="flex flex-wrap gap-2 mt-2">
                            <button
                              onClick={() => copyToClipboard(item.substackNote, `note-${item.id}`)}
                              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              {copiedId === `note-${item.id}` ? "✓ Copied" : "Copy"}
                            </button>
                            <button
                              onClick={() => postToSubstack(item)}
                              disabled={postingId === item.id || item.substackPosted}
                              className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {postingId === item.id ? "Copying..." : item.substackPosted ? "✓ Posted" : "Copy & Open Substack"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* LinkedIn Post */}
                      {activeTab === "linkedin" && (
                        <div className="space-y-4">
                          {/* Post body */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-medium text-gray-700">LinkedIn Post</label>
                              <span className="text-xs text-gray-400">No links in post body — link goes in follow-on comment</span>
                            </div>
                            <textarea
                              value={item.linkedinPost}
                              onChange={e => updatePost(item.id, e.target.value)}
                              rows={10}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono"
                            />
                            <div className="flex flex-wrap gap-2 mt-2">
                              <button
                                onClick={() => copyToClipboard(item.linkedinPost, `li-${item.id}`)}
                                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                {copiedId === `li-${item.id}` ? "✓ Copied" : "Copy Post"}
                              </button>
                              <button
                                onClick={() => markLinkedInPosted(item)}
                                disabled={item.linkedinPosted}
                                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {item.linkedinPosted ? `✓ Posted${item.linkedinPostedAt ? ` · ${new Date(item.linkedinPostedAt).toLocaleDateString()}` : ""}` : "Mark as Posted"}
                              </button>
                            </div>
                          </div>

                          {/* Follow-on comment */}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-semibold text-blue-800">💬 Follow-on Comment</label>
                              <span className="text-xs text-blue-600">Post this as a comment after your post goes live</span>
                            </div>
                            <div className="bg-white border border-blue-200 rounded p-3 text-sm text-gray-800 font-mono select-all">
                              Full article here: {article?.alsLinkedinUrl || article?.url}
                            </div>
                            <button
                              onClick={() => copyToClipboard(`Full article here: ${article?.alsLinkedinUrl || article?.url}`, `li-comment-${item.id}`)}
                              className="mt-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              {copiedId === `li-comment-${item.id}` ? "✓ Copied" : "Copy Comment"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Infographic */}
                      {item.needsInfographic && (
                        <div className="border-t border-gray-100 pt-4">
                          {item.infographicLoading ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                              </svg>
                              Generating infographic...
                            </div>
                          ) : item.infographic ? (
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">Infographic</p>
                              <img
                                src={`data:${item.infographic.mimeType};base64,${item.infographic.image}`}
                                alt={`Infographic for ${item.angle}`}
                                className="w-full rounded-lg border border-gray-200 mb-2"
                              />
                              <button
                                onClick={() => downloadInfographic(item)}
                                className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                              >
                                Download PNG
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 italic">
                              Click "Generate Infographics" below to create this infographic.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Action bar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex flex-wrap gap-3 items-center justify-between">
              <div className="flex flex-wrap gap-3">
                {infographicItems.length > 0 && generatedInfographics.length < infographicItems.length && (
                  <button
                    onClick={handleGenerateInfographics}
                    disabled={generatingInfographics}
                    className="px-5 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    {generatingInfographics ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Generating {infographicItems.length} infographic{infographicItems.length !== 1 ? "s" : ""}...
                      </>
                    ) : `📊 Generate ${infographicItems.length - generatedInfographics.length} Infographic${infographicItems.length - generatedInfographics.length !== 1 ? "s" : ""}`}
                  </button>
                )}
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  ↺ Re-analyze
                </button>
              </div>

              <div className="flex flex-col items-end gap-2">
                {savedCampaignId ? (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                      <p className="text-green-700 font-semibold text-sm">Campaign saved!</p>
                      <p className="text-green-600 text-xs">ID: {savedCampaignId.substring(0,8)}… · Redirecting to campaigns...</p>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleSaveCampaign}
                    disabled={savingCampaign}
                    className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    {savingCampaign ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Saving...
                      </>
                    ) : "💾 Save Campaign"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
