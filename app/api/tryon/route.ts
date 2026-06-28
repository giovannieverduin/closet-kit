import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { put } from "@vercel/blob";
import { fashnTryOn } from "@/lib/tryon";
import { getReferenceUrl, blobUrlForPath } from "@/lib/reference";

export const runtime = "nodejs";
export const maxDuration = 80;

// Farfetch's CDN 429s browser-like User-Agents but serves a plain curl UA. Use that.
const UA = "curl/8.7.1";

async function fetchImage(url: string): Promise<Response> {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (r.ok) return r;
    if ((r.status === 429 || r.status === 403) && i < 3) { await new Promise((s) => setTimeout(s, 1200 * (i + 1))); continue; }
    throw new Error(`could not load garment image (${r.status})`);
  }
  throw new Error("could not load garment image");
}

// Re-host a garment image on our own Blob so FASHN fetches it from unblocked storage
// (retailer CDNs like Farfetch 429 FASHN's servers). Cached by URL hash → fetched once.
async function rehostGarment(url: string): Promise<string> {
  if (url.includes(".blob.vercel-storage.com")) return url;
  const key = `garment/${createHash("sha1").update(url).digest("hex")}.jpg`;
  const existing = await blobUrlForPath(key);
  if (existing) return existing;
  const r = await fetchImage(url);
  const buf = Buffer.from(await r.arrayBuffer());
  const blob = await put(key, buf, {
    access: "public",
    addRandomSuffix: false,
    contentType: r.headers.get("content-type") || "image/jpeg"
  });
  return blob.url;
}

export async function POST(req: NextRequest) {
  try {
    const { personImage, garmentImage, category } = await req.json();
    const person = personImage || (await getReferenceUrl());
    if (!person) return NextResponse.json({ error: "No reference photo set yet" }, { status: 400 });
    if (!garmentImage || !category) {
      return NextResponse.json({ error: "Missing garmentImage or category" }, { status: 400 });
    }

    const garment = await rehostGarment(garmentImage);
    const resultUrl = await fashnTryOn(person, garment, category);

    // Re-host the result too, then return a gated proxy path (raw URL never exposed).
    const img = await fetch(resultUrl);
    if (!img.ok) return NextResponse.json({ error: "Result unavailable" }, { status: 502 });
    const buf = Buffer.from(await img.arrayBuffer());
    const blob = await put(`tryon/${Date.now()}.jpg`, buf, {
      access: "public",
      addRandomSuffix: true,
      contentType: img.headers.get("content-type") || "image/jpeg"
    });
    return NextResponse.json({ url: `/api/img?p=${encodeURIComponent(blob.pathname)}`, pathname: blob.pathname });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Try-on failed" }, { status: 500 });
  }
}
