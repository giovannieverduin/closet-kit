import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Gated download proxy (middleware requires the session cookie for /api/*). Streams an
// allowed remote image back with an attachment header so "save to device" works for
// cross-origin URLs. Host-allowlisted to avoid being an open proxy.
const ALLOW = ["replicate.delivery", "blob.vercel-storage.com"];

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const name = (req.nextUrl.searchParams.get("name") || "look.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  let host = "";
  try { host = new URL(url).hostname; } catch { return NextResponse.json({ error: "Bad url" }, { status: 400 }); }
  if (!ALLOW.some((h) => host === h || host.endsWith(`.${h}`))) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
  }

  const upstream = await fetch(url);
  if (!upstream.ok) return NextResponse.json({ error: "Couldn't fetch the image" }, { status: 502 });
  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store"
    }
  });
}
