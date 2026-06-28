import { NextRequest, NextResponse } from "next/server";
import { extractItem } from "@/lib/anthropic";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mediaType } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: "No image provided" }, { status: 400 });
    const item = await extractItem(imageBase64, mediaType || "image/jpeg");
    return NextResponse.json({ item });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Couldn't read the item" }, { status: 500 });
  }
}
