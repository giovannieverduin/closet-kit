import { NextRequest, NextResponse } from "next/server";
import { listAssessed, createAssessed } from "@/lib/assessed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const assessed = await listAssessed();
    return NextResponse.json({ assessed });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to load saved assessments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.verdict && !body?.reason && !body?.photo) {
      return NextResponse.json({ error: "Nothing to save" }, { status: 400 });
    }
    const score = typeof body.score === "number" ? body.score : undefined;
    const page = await createAssessed({
      name: body.name,
      photo: body.photo,
      verdict: body.verdict,
      reason: body.reason,
      score,
      colours: Array.isArray(body.colours) ? body.colours : undefined,
      occasion: body.occasion,
      link: body.link,
      pieceIds: Array.isArray(body.pieceIds) ? body.pieceIds : undefined
    });
    return NextResponse.json({ ok: true, id: (page as any).id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to save assessment" }, { status: 500 });
  }
}
