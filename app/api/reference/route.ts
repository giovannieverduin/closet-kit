import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getReference, type Ref } from "@/lib/reference";
import { removeBackgroundWhite } from "@/lib/removebg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const previewFor = (ref: Ref | null) => (ref ? `/api/img?p=${encodeURIComponent(ref.pathname)}` : null);

// Is a try-on reference photo set (server-side, shared across all sessions)?
export async function GET() {
  const ref = await getReference();
  return NextResponse.json({ set: !!ref, preview: previewFor(ref) });
}

// Set / replace the reference photo. Background-removed (subject on white) if
// REMOVE_BG_API_KEY is configured; otherwise stored as uploaded.
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const original = Buffer.from(await file.arrayBuffer());
    let bytes = original;
    let bgRemoved = false;
    try {
      const cleaned = await removeBackgroundWhite(original, file.type || "image/jpeg");
      if (cleaned) { bytes = cleaned; bgRemoved = true; }
    } catch {
      // background removal failed (or no key) — keep the original photo
    }

    await put(`reference/${Date.now()}.jpg`, bytes, {
      access: "public",
      addRandomSuffix: true,
      contentType: "image/jpeg"
    });
    const ref = await getReference();
    return NextResponse.json({ ok: true, bgRemoved, preview: previewFor(ref) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Couldn't save the reference photo" }, { status: 500 });
  }
}
