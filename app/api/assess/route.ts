import { NextRequest, NextResponse } from "next/server";
import { listItems } from "@/lib/notion";
import { assessPhoto } from "@/lib/anthropic";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mediaType, note } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: "No image provided" }, { status: 400 });
    const items = await listItems();
    const assessment = await assessPhoto(imageBase64, mediaType || "image/jpeg", items, note);
    return NextResponse.json({ assessment });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Assessment failed" }, { status: 500 });
  }
}
