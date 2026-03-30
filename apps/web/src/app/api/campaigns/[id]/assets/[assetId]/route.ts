import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateAssetStatus } from "@/lib/db";
import type { CampaignAsset } from "@/lib/db";

// PATCH /api/campaigns/[id]/assets/[assetId] - update asset status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, assetId } = await params;
    const body = await req.json();
    const { status, postedAt }: { status: CampaignAsset["status"]; postedAt?: string } = body;

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    await updateAssetStatus(
      session.user.email,
      id,
      assetId,
      status,
      postedAt || (status === "posted" ? new Date().toISOString() : undefined)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating asset status:", error);
    return NextResponse.json(
      { error: "Failed to update asset status" },
      { status: 500 }
    );
  }
}
