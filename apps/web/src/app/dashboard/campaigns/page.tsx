"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { Campaign, CampaignAsset } from "@/lib/db";

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch("/api/campaigns");
      if (!response.ok) {
        throw new Error("Failed to fetch campaigns");
      }
      const data = await response.json();
      setCampaigns(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  const getAssetCounts = (assets: CampaignAsset[]) => {
    return {
      note: assets.filter((a) => a.type === "note").length,
      linkedin: assets.filter((a) => a.type === "linkedin").length,
      infographic: assets.filter((a) => a.type === "infographic").length,
    };
  };

  const getStatusCounts = (assets: CampaignAsset[]) => {
    return {
      draft: assets.filter((a) => a.status === "draft").length,
      posted: assets.filter((a) => a.status === "posted").length,
      dismissed: assets.filter((a) => a.status === "dismissed").length,
    };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Campaigns</h1>
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-600">Loading campaigns...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Campaigns</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          <p className="mt-2 text-gray-600">
            Manage your content campaigns and track posting status
          </p>
        </div>

        {/* Empty state */}
        {campaigns.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
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
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No campaigns yet
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Create your first campaign by generating content for an article
            </p>
            <div className="mt-6">
              <button
                onClick={() => router.push("/dashboard/articles")}
                className="px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors"
              >
                Browse Articles
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => {
              const assetCounts = getAssetCounts(campaign.assets);
              const statusCounts = getStatusCounts(campaign.assets);
              const totalAssets = campaign.assets.length;

              return (
                <div
                  key={campaign.campaignId}
                  onClick={() =>
                    router.push(`/dashboard/campaigns/${campaign.campaignId}`)
                  }
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                >
                  {/* Article title */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {campaign.articleTitle}
                  </h3>

                  {/* Publication and date */}
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <span className="font-medium">{campaign.articleHandle}</span>
                    <span>•</span>
                    <span>{formatDate(campaign.createdAt)}</span>
                  </div>

                  {/* Asset counts */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {assetCounts.note > 0 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EFF6FF] text-[#1E40AF]">
                        {assetCounts.note} Note{assetCounts.note > 1 ? "s" : ""}
                      </span>
                    )}
                    {assetCounts.linkedin > 0 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {assetCounts.linkedin} LinkedIn
                      </span>
                    )}
                    {assetCounts.infographic > 0 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                        {assetCounts.infographic} Infographic
                        {assetCounts.infographic > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* Status progress bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>
                        {statusCounts.posted} / {totalAssets} posted
                      </span>
                      <span>
                        {statusCounts.draft > 0 && `${statusCounts.draft} draft`}
                        {statusCounts.dismissed > 0 &&
                          ` • ${statusCounts.dismissed} dismissed`}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-green-500 h-2 transition-all"
                        style={{
                          width: `${(statusCounts.posted / totalAssets) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* View campaign link */}
                  <div className="flex items-center text-sm text-[#2563EB] font-medium">
                    View campaign
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
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
