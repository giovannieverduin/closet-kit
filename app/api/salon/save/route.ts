import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { createLook } from "@/lib/looks";

export const runtime = "nodejs";

// Persist a Salon result into the Looks profile. The Replicate result URL expires (~1h),
// so re-host it to Blob first, then record it as a Look entry with its own selfie image.
export async function POST(req: NextRequest) {
  try {
    const { imageUrl, color, style } = await req.json();
    if (!imageUrl) return NextResponse.json({ error: "No image to save" }, { status: 400 });

    const up = await fetch(imageUrl);
    if (!up.ok) return NextResponse.json({ error: "Couldn't fetch the styled image" }, { status: 502 });
    const buf = Buffer.from(await up.arrayBuffer());
    const ct = up.headers.get("content-type") || "image/jpeg";
    const ext = ct.includes("png") ? "png" : "jpg";
    const blob = await put(`salon/${Date.now()}.${ext}`, buf, { access: "public", addRandomSuffix: true, contentType: ct });

    const bits = [color, style].filter((s: string) => s && s !== "Keep current");
    const label = bits.length ? `Salon — ${bits.join(", ")}` : "Salon — new look";
    const date = new Date().toISOString().slice(0, 10);

    const page = await createLook({ occasion: label, date, photo: blob.url, tags: ["salon"], notes: "Hair try-on (Salon)" });
    return NextResponse.json({ ok: true, id: (page as any).id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Couldn't save to Looks" }, { status: 500 });
  }
}
