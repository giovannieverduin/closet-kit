import { NextRequest, NextResponse } from "next/server";
import { extractReceiptItemsFromImages } from "@/lib/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST { images: [{ base64, mediaType }] }
// Parse screenshot(s) of an order confirmation / receipt into fashion line-items. No DB writes —
// the client reviews the items, edits as needed, and saves them via /api/items.
export async function POST(req: NextRequest) {
  try {
    const { images } = await req.json();
    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "No screenshot provided" }, { status: 400 });
    }
    const items = await extractReceiptItemsFromImages(images.slice(0, 6)); // cap pages per order
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Receipt import failed" }, { status: 500 });
  }
}
