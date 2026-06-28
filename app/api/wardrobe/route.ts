import { NextResponse } from "next/server";
import { listItems } from "@/lib/notion";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await listItems();
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to load wardrobe" }, { status: 500 });
  }
}
