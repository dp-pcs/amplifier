"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import type { Campaign, CampaignAsset } from "@/lib/db";

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [posting, setPosting] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaign();
  }, [campaignId]);

  const fetchCampaign = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch campaign");
      }
      const data = await response.json();
      setCampaign(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaign");
    } finally {
      setLoading(false);
    }
  };

  const updateAssetStatus = async (
    assetId: string,
    status: CampaignAsset["status"]
  ) => {
    setUpdating(assetId);
    setError(null);

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/assets/${assetId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update asset status");
      }

      // Refetch campaign to get updated data
      await fetchCampaign();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update asset status"
      );
    } finally {
      setUpdating(null);
    }
  };

  const handleCopy = async (content: string, assetId: string) => {
    await navigator.clipboard.writeText(content);
    setCopySuccess(assetId);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const handlePostToSubstack = async (content: string, assetId: string) => {
    setPosting(assetId);
    setError(null);

    try {
      const response = await fetch("/api/substack/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to post to Substack");
      }

      // Mark as posted
      await updateAssetStatus(assetId, "posted");
      alert("Successfully posted to Substack!");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to post to Substack"
      );
    } finally {
      setPosting(null);
    }
  };

  const handleDownloadInfographic = (content: string, assetId: string) => {
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${content}`;
    link.download = `infographic-${assetId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
  };

  const renderAssetCard = (asset: CampaignAsset) => {
    const isNote = asset.type === "note";
    const isLinkedIn = asset.type === "linkedin";
    const isInfographic = asset.type === "infographic";
    const isDraft = asset.status === "draft";
    const isPosted = asset.status === "posted";
    const isDismissed = asset.status === "dismissed";

    const cardClasses = `border rounded-lg p-4 transition-all ${
      isDraft
        ? "bg-white border-[#93C5FD]"
        : isPosted
          ? "bg-green-50 border-green-300"
          : "bg-gray-50 border-gray-300 opacity-60"
    }`;

    return (
      <div key={asset.id} className={cardClasses}>
        {/* Asset content */}
        {(isNote || isLinkedIn) && (
          <div className="mb-4">
            <p
              className={`text-sm ${isDismissed ? "line-through text-gray-500" : "text-gray-900"} whitespace-pre-wrap`}
            >
              {asset.content}
            </p>
          </div>
        )}

        {isInfographic && (
          <div className="mb-4 relative">
            <img
              src={`data:image/png;base64,${asset.content}`}
              alt="Infographic"
              className={`w-full rounded-lg ${isDismissed ? "opacity-40" : ""}`}
            />
            {isPosted && (
              <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Posted
              </div>
            )}
          </div>
        )}

        {/* Status badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isPosted && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Posted {asset.postedAt && formatDate(asset.postedAt)}
              </span>
            )}
            {isDraft && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EFF6FF] text-[#1E40AF]">
                Draft
              </span>
            )}
            {isDismissed && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Dismissed
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {!isDismissed && (
          <div className="flex flex-wrap gap-2">
            {(isNote || isLinkedIn) && (
              <>
                <button
                  onClick={() => handleCopy(asset.content, asset.id)}
                  disabled={updating === asset.id}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {copySuccess === asset.id ? "Copied!" : "Copy"}
                </button>

                {isNote && !isPosted && (
                  <button
                    onClick={() => handlePostToSubstack(asset.content, asset.id)}
                    disabled={posting === asset.id || updating === asset.id}
                    className="px-3 py-1.5 text-sm bg-[#2563EB] text-white rounded hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
                  >
                    {posting === asset.id ? "Posting..." : "Post to Substack"}
                  </button>
                )}

                {!isPosted && (
                  <button
                    onClick={() => updateAssetStatus(asset.id, "posted")}
                    disabled={updating === asset.id}
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    Mark Posted
                  </button>
                )}
              </>
            )}

            {isInfographic && (
              <>
                <button
                  onClick={() => handleDownloadInfographic(asset.content, asset.id)}
                  disabled={updating === asset.id}
                  className="px-3 py-1.5 text-sm bg-[#2563EB] text-white rounded hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
                >
                  Download
                </button>

                {!isPosted && (
                  <button
                    onClick={() => updateAssetStatus(asset.id, "posted")}
                    disabled={updating === asset.id}
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    Mark Posted
                  </button>
                )}
              </>
            )}

            {!isPosted && (
              <button
                onClick={() => updateAssetStatus(asset.id, "dismissed")}
                disabled={updating === asset.id}
                className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Dismiss
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading campaign...</div>
      </div>
    );
  }

  if (error && !campaign) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.push("/dashboard/campaigns")}
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
            Back to Campaigns
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return null;
  }

  const notes = campaign.assets.filter((a) => a.type === "note");
  const linkedin = campaign.assets.filter((a) => a.type === "linkedin");
  const infographics = campaign.assets.filter((a) => a.type === "infographic");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <button
          onClick={() => router.push("/dashboard/campaigns")}
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
          Back to Campaigns
        </button>

        {/* Error message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Campaign header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {campaign.articleTitle}
          </h1>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="font-medium">{campaign.articleHandle}</span>
            <span>•</span>
            <span>Created {formatDate(campaign.createdAt)}</span>
            <span>•</span>
            <a
              href={campaign.articleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2563EB] hover:text-[#1D4ED8] flex items-center"
            >
              View article
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
          </div>
        </div>

        {/* Substack Notes section */}
        {notes.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Substack Notes ({notes.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {notes.map(renderAssetCard)}
            </div>
          </div>
        )}

        {/* LinkedIn Posts section */}
        {linkedin.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              LinkedIn Posts ({linkedin.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {linkedin.map(renderAssetCard)}
            </div>
          </div>
        )}

        {/* Infographics section */}
        {infographics.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Infographics ({infographics.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {infographics.map(renderAssetCard)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
