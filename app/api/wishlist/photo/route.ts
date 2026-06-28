import { NextRequest, NextResponse } from "next/server";
import { getWishlistPhoto } from "@/lib/wishlist";
import { safePublicUrl } from "@/lib/safeUrl";

export const dynamic = "force-dynamic";

// Auth-proxied on-body image: the middleware requires the session cookie for /api/*,
// so a bare <img src="/api/wishlist/photo?id="> only loads for an authenticated session.
// The raw Blob URL is never exposed to the client.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    const stored = await getWishlistPhoto(id);
    const url = safePublicUrl(stored);
    if (!url) return NextResponse.json({ error: "No photo" }, { status: 404 });
    const upstream = await fetch(url);
    if (!upstream.ok) return NextResponse.json({ error: "Photo unavailable" }, { status: 502 });
    const buf = await upstream.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "private, max-age=300"
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
