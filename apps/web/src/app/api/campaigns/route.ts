import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createCampaign, listCampaigns } from "@/lib/db";
import type { CampaignAsset } from "@/lib/db";

// POST /api/campaigns - create a new campaign
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      articleUrl,
      articleTitle,
      articleHandle,
      isOwnArticle,
      assets,
    }: {
      articleUrl: string;
      articleTitle: string;
      articleHandle: string;
      isOwnArticle: boolean;
      assets: CampaignAsset[];
    } = body;

    if (!articleUrl || !articleTitle || !articleHandle || !assets) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const campaign = await createCampaign(session.user.email, {
      articleUrl,
      articleTitle,
      articleHandle,
      isOwnArticle,
      assets,
      status: "active",
    });

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}

// GET /api/campaigns - list all campaigns for the user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaigns = await listCampaigns(session.user.email);
    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("Error listing campaigns:", error);
    return NextResponse.json(
      { error: "Failed to list campaigns" },
      { status: 500 }
    );
  }
}
