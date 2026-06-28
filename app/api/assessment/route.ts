import { NextRequest, NextResponse } from "next/server";
import { resolveAssessment, saveAssessment, clearAssessment } from "@/lib/assessment";
import { extractColorAssessment } from "@/lib/anthropic";
import { DEFAULT_ASSESSMENT } from "@/lib/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// GET — the active colour assessment (uploaded one, or the example default).
export async function GET() {
  const { assessment, custom } = await resolveAssessment();
  return NextResponse.json({ assessment, custom });
}

// POST { imageBase64, mediaType } — read a colour-analysis photo, extract a
// structured assessment, persist it, and return it.
export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mediaType } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: "No image provided" }, { status: 400 });
    const assessment = await extractColorAssessment(imageBase64, mediaType || "image/jpeg");
    await saveAssessment(assessment);
    return NextResponse.json({ assessment, custom: true });
  } catch (e) {
    console.error("assessment extract failed:", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "Couldn't read that colour analysis. Try a clearer photo." }, { status: 500 });
  }
}

// DELETE — reset to the example default.
export async function DELETE() {
  await clearAssessment();
  return NextResponse.json({ assessment: DEFAULT_ASSESSMENT, custom: false });
}
