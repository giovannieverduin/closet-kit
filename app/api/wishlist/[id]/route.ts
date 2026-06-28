import { NextRequest, NextResponse } from "next/server";
import { updateWishlistItem, archiveWishlistItem } from "@/lib/wishlist";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const patch: { note?: string; priority?: string } = {};
    if (typeof body.note === "string") patch.note = body.note;
    if (body.priority === "Really want" || body.priority === "Maybe") patch.priority = body.priority;
    await updateWishlistItem(params.id, patch);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await archiveWishlistItem(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to remove" }, { status: 500 });
  }
}
