import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUser } from "@/lib/db";
import { markdownToProseMirror, validateProseMirrorDoc } from "@/lib/prosemirror";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, subtitle, markdown, publishNow } = await req.json();

    if (!title || !markdown) {
      return NextResponse.json(
        { error: "title and markdown are required" },
        { status: 400 }
      );
    }

    // Get user's Substack cookie from DynamoDB
    const user = await getUser(session.user.email);
    if (!user?.substackCookie) {
      return NextResponse.json(
        {
          error: "Substack cookie not configured. Please add it in Settings.",
          needsCookie: true,
        },
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

    // Get user's Substack handle (publication URL)
    const substackHandle = user.substackHandle;
    if (!substackHandle) {
      return NextResponse.json(
        {
          error:
            "Substack handle not configured. Please add it in Settings.",
        },
        { status: 400 }
      );
    }

    // Convert markdown to ProseMirror format
    const proseMirrorDoc = markdownToProseMirror(markdown);

    // Validate the document
    if (!validateProseMirrorDoc(proseMirrorDoc)) {
      return NextResponse.json(
        { error: "Invalid markdown format" },
        { status: 400 }
      );
    }

    // Create draft on Substack
    // Note: Based on reverse engineering, Substack uses /api/v1/drafts endpoint
    // The exact format may need adjustment based on actual API behavior
    const publicationUrl = `https://${substackHandle}.substack.com`;

    const draftPayload = {
      title,
      subtitle: subtitle || "",
      body_json: JSON.stringify(proseMirrorDoc),
      draft_title: title,
      draft_subtitle: subtitle || "",
      draft_body_json: JSON.stringify(proseMirrorDoc),
      type: "newsletter", // or "thread" for notes
      audience: "everyone", // or "only_paid", "founding", etc.
    };

    // Create draft
    const draftResponse = await fetch(`${publicationUrl}/api/v1/drafts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: connectSidCookie,
        Origin: publicationUrl,
        Referer: `${publicationUrl}/publish`,
      },
      body: JSON.stringify(draftPayload),
    });

    if (!draftResponse.ok) {
      const errorText = await draftResponse.text();
      console.error("Substack draft creation error:", errorText);
      return NextResponse.json(
        {
          error: "Failed to create draft on Substack",
          details: errorText,
        },
        { status: draftResponse.status }
      );
    }

    const draftResult = await draftResponse.json();
    const draftId = draftResult.id || draftResult.draft_id;

    if (!draftId) {
      return NextResponse.json(
        { error: "Failed to get draft ID from Substack" },
        { status: 500 }
      );
    }

    // If publishNow is true, publish the draft
    if (publishNow) {
      const publishResponse = await fetch(
        `${publicationUrl}/api/v1/drafts/${draftId}/publish`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: connectSidCookie,
            Origin: publicationUrl,
            Referer: `${publicationUrl}/publish`,
          },
          body: JSON.stringify({
            // Add any publish-specific options here
            send_email: true, // Send to subscribers
          }),
        }
      );

      if (!publishResponse.ok) {
        const errorText = await publishResponse.text();
        console.error("Substack publish error:", errorText);
        return NextResponse.json(
          {
            error: "Failed to publish draft on Substack",
            details: errorText,
            draftId,
            draftUrl: `${publicationUrl}/publish/post/${draftId}`,
          },
          { status: publishResponse.status }
        );
      }

      const publishResult = await publishResponse.json();
      const postId = publishResult.id || publishResult.post_id || draftId;
      const postSlug = publishResult.slug || "";
      const postUrl = postSlug
        ? `${publicationUrl}/p/${postSlug}`
        : `${publicationUrl}/p/${postId}`;

      return NextResponse.json({
        success: true,
        status: "published",
        postId,
        postUrl,
        draftId,
      });
    }

    // Return draft info
    return NextResponse.json({
      success: true,
      status: "draft",
      draftId,
      draftUrl: `${publicationUrl}/publish/post/${draftId}`,
    });
  } catch (error) {
    console.error("Error publishing to Substack:", error);
    return NextResponse.json(
      {
        error: "Failed to publish to Substack",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
