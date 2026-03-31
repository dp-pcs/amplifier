"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Article {
  id: number;
  title: string;
  subtitle: string | null;
  date: string;
  url: string;
  description: string | null;
  coverImage: string | null;
  authors?: string[];
}

interface AlsLinks {
  linkedin: string;
  email: string;
}

export default function ArticlesPage() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [userHandle, setUserHandle] = useState("");
  const [trilogyHandle, setTrilogyHandle] = useState("");
  const [activePublication, setActivePublication] = useState<"user" | "trilogy">("user");
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedAuthors, setSelectedAuthors] = useState<Set<string>>(new Set());
  const [availableAuthors, setAvailableAuthors] = useState<string[]>([]);
  const [alsLinks, setAlsLinks] = useState<Map<string, AlsLinks>>(new Map());
  const [alsLoading, setAlsLoading] = useState<Set<string>>(new Set());
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Load saved handles from settings on mount
  useEffect(() => {
    async function loadSavedHandles() {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const data = await response.json();
          if (data.substackHandle) {
            setUserHandle(data.substackHandle);
            setHandle(data.substackHandle);
          }
          if (data.trilogyHandle) {
            setTrilogyHandle(data.trilogyHandle);
          }
        }
      } catch (err) {
        console.error("Failed to load saved handles:", err);
      } finally {
        setInitialLoading(false);
      }
    }
    loadSavedHandles();
  }, []);

  const fetchArticlesForHandle = async (targetHandle: string, newOffset: number = 0, append: boolean = false) => {
    if (!targetHandle.trim()) {
      setError("Please enter a Substack handle");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/articles?handle=${encodeURIComponent(targetHandle)}&offset=${newOffset}&limit=20`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch articles");
      }

      const data = await response.json();

      if (append) {
        setArticles((prev) => [...prev, ...data.articles]);
      } else {
        setArticles(data.articles);

        // Extract unique authors for filtering (only for org publication)
        if (trilogyHandle && targetHandle === trilogyHandle) {
          const authors = new Set<string>();
          data.articles.forEach((article: Article) => {
            article.authors?.forEach(author => authors.add(author));
          });
          const authorList = Array.from(authors).sort();
          setAvailableAuthors(authorList);
          setSelectedAuthors(new Set(authorList)); // All authors selected by default
        } else {
          setAvailableAuthors([]);
          setSelectedAuthors(new Set());
        }
      }

      setHasMore(data.articles.length === 20);
      setOffset(newOffset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchArticles = (newOffset: number = 0, append: boolean = false) => {
    return fetchArticlesForHandle(handle, newOffset, append);
  };

  const handleBrowse = () => {
    setOffset(0);
    fetchArticlesForHandle(handle, 0, false);
  };

  const switchToUserPublication = () => {
    setActivePublication("user");
    setHandle(userHandle);
    setArticles([]);
    setOffset(0);
    setAvailableAuthors([]);
    setSelectedAuthors(new Set());
  };

  const switchToTrilogyPublication = () => {
    setActivePublication("trilogy");
    setHandle(trilogyHandle);
    setArticles([]);
    setOffset(0);
    setAvailableAuthors([]);
    setSelectedAuthors(new Set());
    // Auto-fetch when switching to org publication
    if (trilogyHandle.trim()) {
      setTimeout(() => fetchArticlesForHandle(trilogyHandle, 0, false), 0);
    }
  };

  const toggleAuthor = (author: string) => {
    const newSelected = new Set(selectedAuthors);
    if (newSelected.has(author)) {
      newSelected.delete(author);
    } else {
      newSelected.add(author);
    }
    setSelectedAuthors(newSelected);
  };

  const filteredArticles = articles.filter(article => {
    // If no author filter active or not viewing org publication, show all
    if (!trilogyHandle || handle !== trilogyHandle || availableAuthors.length === 0) {
      return true;
    }
    // Show articles by selected authors or articles with no author info
    if (!article.authors || article.authors.length === 0) {
      return true;
    }
    return article.authors.some(author => selectedAuthors.has(author));
  });

  const handleLoadMore = () => {
    const newOffset = offset + 20;
    fetchArticles(newOffset, true);
  };

  const handleSelectArticle = (article: Article) => {
    const articleWithHandle = { ...article, handle };
    sessionStorage.setItem(`article_${article.id}`, JSON.stringify(articleWithHandle));
    router.push(`/dashboard/articles/${article.id}/generate`);
  };

  const handleGenerateCampaign = (article: Article) => {
    const articleWithHandle = { ...article, handle };
    sessionStorage.setItem(`article_${article.id}`, JSON.stringify(articleWithHandle));
    router.push(`/dashboard/articles/${article.id}/campaign`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Fetch als links for an article
  const fetchAlsLinks = async (articleUrl: string) => {
    // Skip if already loaded or loading
    if (alsLinks.has(articleUrl) || alsLoading.has(articleUrl)) {
      return;
    }

    setAlsLoading(prev => new Set(prev).add(articleUrl));

    try {
      const response = await fetch(`/api/als?url=${encodeURIComponent(articleUrl)}`);
      if (response.ok) {
        const links = await response.json();
        setAlsLinks(prev => new Map(prev).set(articleUrl, links));
      }
    } catch (error) {
      console.error("Failed to fetch als links:", error);
    } finally {
      setAlsLoading(prev => {
        const next = new Set(prev);
        next.delete(articleUrl);
        return next;
      });
    }
  };

  // Fetch als links for all visible articles after they load
  useEffect(() => {
    if (articles.length > 0) {
      filteredArticles.forEach(article => {
        fetchAlsLinks(article.url);
      });
    }
  }, [articles]);

  const copyToClipboard = async (text: string, linkId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(linkId);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Browse Articles
          </h1>
          <p className="text-gray-600">
            Enter a Substack handle to browse their published articles
          </p>
        </div>

        {/* Publication switcher pills (only show if trilogyHandle is set) */}
        {trilogyHandle && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
            <div className="flex gap-2">
              <button
                onClick={switchToUserPublication}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activePublication === "user"
                    ? "bg-[#2563EB] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                My Substack
              </button>
              <button
                onClick={switchToTrilogyPublication}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activePublication === "trilogy"
                    ? "bg-[#2563EB] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {trilogyHandle.charAt(0).toUpperCase() + trilogyHandle.slice(1)}
              </button>
            </div>
          </div>
        )}

        {/* Search bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex gap-4">
            <div className="flex-1">
              <label
                htmlFor="handle"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Substack Handle
              </label>
              <input
                id="handle"
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBrowse()}
                placeholder="e.g., trilogyai"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                disabled={trilogyHandle !== ""}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleBrowse}
                disabled={loading || !handle.trim()}
                className="px-6 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading && !articles.length ? "Loading..." : "Browse"}
              </button>
            </div>
          </div>
          {error && (
            <p className="mt-4 text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* Author filter (only show for org publication) */}
        {trilogyHandle && handle === trilogyHandle && availableAuthors.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-8">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Filter by author:</h3>
            <div className="flex flex-wrap gap-3">
              {availableAuthors.map((author) => (
                <label key={author} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedAuthors.has(author)}
                    onChange={() => toggleAuthor(author)}
                    className="w-4 h-4 text-[#2563EB] border-gray-300 rounded focus:ring-[#2563EB]"
                  />
                  <span className="ml-2 text-sm text-gray-700">{author}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Articles grid */}
        {articles.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredArticles.map((article) => (
                <div
                  key={article.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {article.coverImage && (
                    <div className="aspect-video w-full overflow-hidden bg-gray-100">
                      <img
                        src={article.coverImage}
                        alt={article.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
                        {article.title}
                      </h3>
                      {article.subtitle && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {article.subtitle}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-4">
                      {formatDate(article.date)}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleGenerateCampaign(article)}
                        className="flex-1 px-3 py-2 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:bg-[#1D4ED8] transition-colors"
                      >
                        🚀 Campaign
                      </button>
                      <button
                        onClick={() => handleSelectArticle(article)}
                        className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Single
                      </button>
                    </div>

                    {/* ALS Tracking Links */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      {alsLoading.has(article.url) ? (
                        <div className="text-xs text-gray-400">Loading tracking links...</div>
                      ) : alsLinks.has(article.url) ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">🔗 LinkedIn:</span>
                            <a
                              href={alsLinks.get(article.url)!.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#2563EB] hover:underline truncate flex-1"
                            >
                              {alsLinks.get(article.url)!.linkedin.replace('https://', '')}
                            </a>
                            <button
                              onClick={() => copyToClipboard(alsLinks.get(article.url)!.linkedin, `${article.id}-linkedin`)}
                              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-0.5"
                            >
                              {copiedLink === `${article.id}-linkedin` ? "✓" : "Copy"}
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">📧 Email:</span>
                            <a
                              href={alsLinks.get(article.url)!.email}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#2563EB] hover:underline truncate flex-1 ml-4"
                            >
                              {alsLinks.get(article.url)!.email.replace('https://', '')}
                            </a>
                            <button
                              onClick={() => copyToClipboard(alsLinks.get(article.url)!.email, `${article.id}-email`)}
                              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-0.5"
                            >
                              {copiedLink === `${article.id}-email` ? "✓" : "Copy"}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load more button */}
            {hasMore && (
              <div className="flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        ) : (
          !loading && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No articles yet
              </h3>
              <p className="text-gray-600">
                Enter a Substack handle above and click Browse to see articles
              </p>
            </div>
          )
        )}

        {/* Loading skeleton */}
        {loading && !articles.length && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse"
              >
                <div className="aspect-video w-full bg-gray-200" />
                <div className="p-5">
                  <div className="h-5 bg-gray-200 rounded mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4" />
                  <div className="h-10 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
