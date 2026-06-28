import { NextRequest, NextResponse } from "next/server";
import { listLooks, createLook } from "@/lib/looks";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const looks = await listLooks();
    return NextResponse.json({ looks });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to load looks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const hasContent = body?.photo || body?.occasion || (body?.tags?.length) || (body?.pieceIds?.length);
    if (!hasContent) {
      return NextResponse.json({ error: "Add a photo, an occasion, or some tags" }, { status: 400 });
    }
    const rating = typeof body.rating === "number" && body.rating >= 1 && body.rating <= 5 ? body.rating : undefined;
    const page = await createLook({
      photo: body.photo,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      rating,
      date: body.date,
      wornWith: body.wornWith,
      occasion: body.occasion,
      pieceIds: Array.isArray(body.pieceIds) ? body.pieceIds : undefined,
      notes: body.notes
    });
    return NextResponse.json({ ok: true, id: (page as any).id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to save look" }, { status: 500 });
  }
}
