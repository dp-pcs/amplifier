import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUser, upsertUser } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUser(session.user.email);

    if (!user) {
      return NextResponse.json({
        substackHandle: "",
        substackCookie: "",
        linkedinHandle: "",
      });
    }

    // Mask the cookie - only show last 8 characters
    const maskedCookie = user.substackCookie
      ? `${"*".repeat(Math.max(0, user.substackCookie.length - 8))}${user.substackCookie.slice(-8)}`
      : "";

    return NextResponse.json({
      substackHandle: user.substackHandle || "",
      substackCookie: maskedCookie,
      linkedinHandle: user.linkedinHandle || "",
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { substackHandle, substackCookie, linkedinHandle } = body;

    // Prepare update data - only include fields that are provided
    const updateData: {
      substackHandle?: string;
      substackCookie?: string;
      linkedinHandle?: string;
    } = {};

    if (substackHandle !== undefined) {
      updateData.substackHandle = substackHandle;
    }

    if (substackCookie !== undefined && !substackCookie.startsWith("*")) {
      // Only update cookie if it's not the masked value
      updateData.substackCookie = substackCookie;
    }

    if (linkedinHandle !== undefined) {
      updateData.linkedinHandle = linkedinHandle;
    }

    await upsertUser(session.user.email, updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
