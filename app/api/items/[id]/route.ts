import { NextRequest, NextResponse } from "next/server";
import { getItem, updateItem, archiveItem } from "@/lib/notion";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const item = await getItem(params.id);
    return NextResponse.json({ item });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Not found" }, { status: 404 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    await updateItem(params.id, body);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await archiveItem(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Delete failed" }, { status: 500 });
  }
}
