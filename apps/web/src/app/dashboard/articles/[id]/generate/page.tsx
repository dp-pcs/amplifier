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
}

export default function GeneratePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const articleId = params.id as string;

  useEffect(() => {
    // Try to get article from sessionStorage first (for quick navigation)
    const cached = sessionStorage.getItem(`article_${articleId}`);
    if (cached) {
      try {
        setArticle(JSON.parse(cached));
        setLoading(false);
        return;
      } catch (e) {
        console.error("Failed to parse cached article:", e);
      }
    }

    // Otherwise, fetch from API
    // For now, we'll just show a basic view since we need the handle to fetch
    // In a real implementation, we'd either:
    // 1. Store article details in sessionStorage when clicking Select
    // 2. Or add handle to the URL params
    setLoading(false);
  }, [articleId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading article...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">{error}</p>
          </div>
          <button
            onClick={() => router.push("/dashboard/articles")}
            className="mt-4 text-purple-600 hover:text-purple-700"
          >
            ← Back to Articles
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* Article info */}
        {article ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
            {article.coverImage && (
              <div className="aspect-video w-full overflow-hidden rounded-lg bg-gray-100 mb-6">
                <img
                  src={article.coverImage}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {article.title}
            </h1>
            {article.subtitle && (
              <p className="text-xl text-gray-600 mb-4">{article.subtitle}</p>
            )}
            <p className="text-sm text-gray-500 mb-4">
              Published {formatDate(article.date)}
            </p>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-purple-600 hover:text-purple-700"
            >
              View original article
              <svg
                className="w-4 h-4 ml-1"
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
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Article #{articleId}
            </h1>
            <p className="text-gray-600">
              Selected article for content generation
            </p>
          </div>
        )}

        {/* Placeholder for content generation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-purple-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Content Generation Coming Soon
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              This feature will allow you to generate LinkedIn posts, Twitter
              threads, and other content based on this article.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
