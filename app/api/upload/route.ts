import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

// Uploads an image to Vercel Blob (public, unguessable URL) and returns the URL.
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    const safe = (file.name || "image").replace(/[^a-zA-Z0-9._-]/g, "_");
    const blob = await put(`wardrobe/${Date.now()}-${safe}`, file, {
      access: "public",
      addRandomSuffix: true
    });
    return NextResponse.json({ url: blob.url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Upload failed" }, { status: 500 });
  }
}
