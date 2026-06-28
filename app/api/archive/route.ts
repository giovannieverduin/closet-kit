import { NextRequest, NextResponse } from "next/server";
import { bulkSetStatus } from "@/lib/notion";

export const dynamic = "force-dynamic";

// POST { ids: string[], status: string } -> soft archive/restore one or many.
// "Archived" to archive; "Owns" (or "Wishlist") to restore.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ids = Array.isArray(body?.ids) ? body.ids.filter((i: unknown) => typeof i === "string") : [];
    const status = typeof body?.status === "string" ? body.status.trim() : "";
    if (!ids.length) return NextResponse.json({ error: "No items selected" }, { status: 400 });
    if (!status) return NextResponse.json({ error: "A target status is required" }, { status: 400 });
    const result = await bulkSetStatus(ids, status);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to update items" }, { status: 500 });
  }
}
