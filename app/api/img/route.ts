import { NextRequest, NextResponse } from "next/server";
import { blobUrlForPath } from "@/lib/reference";

export const dynamic = "force-dynamic";

// Auth-proxy for our Blob images (try-on results, reference): the middleware gates
// /api/*, so a bare <img src="/api/img?p="> only loads for an authenticated session,
// and the raw public Blob URL is never exposed to the client.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams.get("p");
  if (!p) return NextResponse.json({ error: "Missing p" }, { status: 400 });
  try {
    const url = await blobUrlForPath(p);
    if (!url) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const upstream = await fetch(url);
    if (!upstream.ok) return NextResponse.json({ error: "Unavailable" }, { status: 502 });
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
