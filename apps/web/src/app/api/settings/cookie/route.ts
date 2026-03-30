import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { upsertUser } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { cookie } = body;

    if (!cookie || typeof cookie !== "string") {
      return NextResponse.json(
        { error: "Cookie value is required" },
        { status: 400 }
      );
    }

    // Update only the substackCookie field
    await upsertUser(session.user.email, {
      substackCookie: cookie,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error saving cookie:", error);
    return NextResponse.json(
      { error: "Failed to save cookie" },
      { status: 500 }
    );
  }
}
