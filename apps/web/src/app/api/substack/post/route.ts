import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUser } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content } = await req.json();

    if (!content) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    // Get user's Substack cookie from DynamoDB
    const user = await getUser(session.user.email);
    if (!user?.substackCookie) {
      return NextResponse.json(
        { error: "Substack cookie not configured. Please add it in Settings." },
        { status: 400 }
      );
    }

    // Parse the cookie to get connect.sid
    const cookies = user.substackCookie.split("; ");
    const connectSidCookie = cookies.find((c) => c.startsWith("connect.sid="));

    if (!connectSidCookie) {
      return NextResponse.json(
        { error: "Invalid Substack cookie format" },
        { status: 400 }
      );
    }

    // Create ProseMirror JSON document
    const proseMirrorDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: content,
            },
          ],
        },
      ],
    };

    // Post to Substack Notes API
    const response = await fetch("https://substack.com/api/v1/comment/feed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: connectSidCookie,
        Origin: "https://substack.com",
        Referer: "https://substack.com/",
      },
      body: JSON.stringify({
        body_json: JSON.stringify(proseMirrorDoc),
        context: "feed",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Substack API error:", errorText);
      return NextResponse.json(
        { error: "Failed to post to Substack" },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Error posting to Substack:", error);
    return NextResponse.json(
      { error: "Failed to post to Substack" },
      { status: 500 }
    );
  }
}
