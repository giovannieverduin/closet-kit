import { NextRequest, NextResponse } from "next/server";
import { extractGarmentsFromFrames } from "@/lib/anthropic";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { frames } = await req.json();
    if (!Array.isArray(frames) || !frames.length) {
      return NextResponse.json({ error: "No frames provided" }, { status: 400 });
    }
    const items = await extractGarmentsFromFrames(frames.slice(0, 24).map((b: string) => ({ base64: b, mediaType: "image/jpeg" })));
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Couldn't read the video" }, { status: 500 });
  }
}
