import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

// Hair colour/style try-on via Replicate's FLUX Kontext (instruction-based image editing).
// POST submits a prediction and returns { requestId }; the browser polls GET /api/hair?id=
// which proxies Replicate's prediction status. Set REPLICATE_API_TOKEN (falls back to
// HAIR_API_KEY). Model overridable via HAIR_MODEL.
const MODEL = process.env.HAIR_MODEL || "black-forest-labs/flux-kontext-pro";

const token = () => process.env.REPLICATE_API_TOKEN || process.env.HAIR_API_KEY || "";
const headers = (t: string) => ({ Authorization: `Bearer ${t}`, "Content-Type": "application/json" });

function buildPrompt(color: string, style: string): string {
  const c = color && String(color).trim();
  const s = style && String(style).trim();
  const edits: string[] = [];
  if (s) edits.push(`restyle her hair as a ${s}`);
  if (c) edits.push(`change her hair colour to ${c}`);
  const edit = edits.join(" and ") || "subtly refresh her hair";
  return `Photorealistic photo of the same woman. ${edit[0].toUpperCase()}${edit.slice(1)}. Keep her face, skin tone, expression, body, clothing and the background exactly the same.`;
}

const pickUrl = (out: any): string | null => {
  if (typeof out === "string") return out;
  if (Array.isArray(out)) return out.length ? pickUrl(out[out.length - 1]) : null;
  if (out && typeof out === "object") return out.url || out.image || null;
  return null;
};

export async function POST(req: NextRequest) {
  try {
    const t = token();
    if (!t) return NextResponse.json({ error: "Hair styling key is not configured (set REPLICATE_API_TOKEN)" }, { status: 500 });

    const { imageUrl, color, style } = await req.json();
    if (!imageUrl) return NextResponse.json({ error: "No image URL provided" }, { status: 400 });

    const res = await fetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, {
      method: "POST",
      headers: headers(t),
      body: JSON.stringify({
        input: {
          prompt: buildPrompt(color, style),
          input_image: imageUrl,
          aspect_ratio: "match_input_image",
          output_format: "jpg",
          safety_tolerance: 2
        }
      })
    });
    const text = await res.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch {}

    if (!res.ok) {
      console.error("hair submit failed", res.status, text.slice(0, 400));
      return NextResponse.json(
        { error: `Hair provider ${res.status}: ${data?.detail || data?.title || text.slice(0, 160) || "no detail"}` },
        { status: 502 }
      );
    }
    if (data.id) return NextResponse.json({ requestId: data.id });
    return NextResponse.json({ error: "Hair provider returned no prediction id" }, { status: 502 });
  } catch (e: any) {
    console.error("hair submit error", e?.message);
    return NextResponse.json({ error: e.message || "Hair try-on failed" }, { status: 500 });
  }
}

// Client polls this until status is succeeded/failed.
export async function GET(req: NextRequest) {
  try {
    const t = token();
    if (!t) return NextResponse.json({ error: "Hair styling key is not configured" }, { status: 500 });
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "No id provided" }, { status: 400 });

    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, { headers: headers(t) });
    const data: any = await res.json().catch(() => ({}));
    const status = String(data.status || "").toLowerCase();

    if (status === "succeeded") {
      const resultUrl = pickUrl(data.output);
      if (!resultUrl) return NextResponse.json({ status: "failed", error: "Done but no image in output" });
      return NextResponse.json({ status: "succeeded", resultUrl });
    }
    if (["failed", "canceled", "cancelled"].includes(status)) {
      return NextResponse.json({ status: "failed", error: data.error || "Hair styling failed" });
    }
    return NextResponse.json({ status: status || "processing" });
  } catch (e: any) {
    return NextResponse.json({ status: "processing", error: e?.message });
  }
}
