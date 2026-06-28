import { NextRequest, NextResponse } from "next/server";
import { listItems } from "@/lib/notion";
import { assembleOutfits } from "@/lib/anthropic";

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  try {
    const { occasion } = await req.json();
    if (!occasion || typeof occasion !== "string") {
      return NextResponse.json({ error: "Tell me the occasion" }, { status: 400 });
    }
    const items = await listItems();
    const { looks, gaps } = await assembleOutfits(items, occasion);
    const owned = items
      .filter((i) => i.status === "Owns")
      .map((i) => ({ id: i.id, name: i.name, category: i.category, colours: i.colours, designer: i.designer, photo: i.photo }));
    return NextResponse.json({ looks, gaps, items: owned });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Couldn't assemble looks" }, { status: 500 });
  }
}
