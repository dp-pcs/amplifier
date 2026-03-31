import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "node:crypto";

const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const ASSETS_BUCKET = process.env.ASSETS_BUCKET || "amplifier-dev-assets-913524910742";

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

    // Substack's /api/v1/comment/feed is behind Cloudflare bot protection —
    // server-side requests are blocked regardless of headers.
    // Workaround: save the note text to S3 so the user can copy and post
    // directly from their browser on substack.com/notes.
    const key = `substack-notes/${session.user.email}/${crypto.randomUUID()}.txt`;

    await s3.send(new PutObjectCommand({
      Bucket: ASSETS_BUCKET,
      Key: key,
      Body: content,
      ContentType: "text/plain",
    }));

    console.log(`Substack note saved to S3: ${key}`);

    // Return the content back so the UI can put it in the clipboard
    return NextResponse.json({
      success: true,
      saved: true,
      content,
      s3Key: key,
      message: "Note saved. Copy the text and paste it into Substack Notes.",
    });
  } catch (error) {
    console.error("Error saving Substack note:", error);
    return NextResponse.json(
      { error: "Failed to save note" },
      { status: 500 }
    );
  }
}
