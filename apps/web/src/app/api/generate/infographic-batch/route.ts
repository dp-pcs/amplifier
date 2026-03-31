import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "node:crypto";

const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const ASSETS_BUCKET = process.env.ASSETS_BUCKET || "amplifier-dev-assets-913524910742";

// gemini-3-pro-image-preview = "Nano Banana Pro" — generateContent with IMAGE modality
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image-preview";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { items } = await req.json();
    if (!items?.length) {
      return NextResponse.json({ error: "items array is required" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json({ error: "Infographic generation is not configured on this server" }, { status: 503 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: IMAGE_MODEL });

    const results: Array<{ id: number; url: string; s3Key: string; mimeType: string } | { id: number; error: string }> = [];

    for (const item of items) {
      try {
        const styleGuide: Record<string, string> = {
          flow: "Vertical flow diagram with numbered steps and connecting arrows.",
          comparison: "Side-by-side comparison with two columns (Before/After or Option A/B).",
          list: "Bold numbered list with large numbers on the left and descriptions on the right.",
          architecture: "Layered system diagram with boxes, arrows, and labels showing how components connect.",
          stat: "Bold central statistic in huge text with supporting context below.",
        };
        const style = item.infographicStyle || "list";
        const layoutInstruction = styleGuide[style] || styleGuide.list;

        const prompt = `Create a professional LinkedIn-ready infographic.

Article: ${item.articleTitle}
Theme/Angle: ${item.angle}
Key Insight: ${item.keyInsight}
${item.url ? `URL: ${item.url}` : ""}

Layout style: ${layoutInstruction}

Design specifications:
- Dark background (deep navy, #0F0F1A)
- Modern tech aesthetic, purple (#9333EA) and blue (#3B82F6) accent colors
- Theme/angle as the headline in large bold text at the top
- 3-5 key points that illustrate the insight using the specified layout style
- Clean minimal design, strong visual hierarchy, plenty of white space
- URL in small text at the bottom
- LinkedIn landscape dimensions (1200x627px)
- High contrast, professional sans-serif typography`;

        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] } as any,
        });

        const parts = result.response.candidates?.[0]?.content?.parts ?? [];
        const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/")) as any;

        if (imagePart?.inlineData) {
          const { data: b64, mimeType } = imagePart.inlineData;
          const ext = mimeType.split("/")[1] || "png";
          const key = `infographics/${session.user!.email}/${crypto.randomUUID()}.${ext}`;
          const buf = Buffer.from(b64, "base64");

          // Upload to S3
          await s3.send(new PutObjectCommand({
            Bucket: ASSETS_BUCKET,
            Key: key,
            Body: buf,
            ContentType: mimeType,
          }));

          // Generate presigned URL (valid 7 days)
          const url = await getSignedUrl(s3, new GetObjectCommand({
            Bucket: ASSETS_BUCKET,
            Key: key,
          }), { expiresIn: 7 * 24 * 60 * 60 });

          results.push({ id: item.id, s3Key: key, url, mimeType });
        } else {
          results.push({ id: item.id, error: "No image generated" });
        }
      } catch (err) {
        console.error(`Infographic failed for item ${item.id}:`, err);
        results.push({ id: item.id, error: String(err) });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error generating infographic batch:", error);
    return NextResponse.json({ error: "Failed to generate infographics" }, { status: 500 });
  }
}
