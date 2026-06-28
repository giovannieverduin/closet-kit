import { NextRequest, NextResponse } from "next/server";
import { createItem } from "@/lib/notion";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    const page = await createItem(body);
    return NextResponse.json({ ok: true, id: (page as any).id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to save item" }, { status: 500 });
  }
}
