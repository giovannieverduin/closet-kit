import { NextRequest, NextResponse } from "next/server";
import { listItems } from "@/lib/notion";
import { suggestLook } from "@/lib/anthropic";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { occasion } = await req.json().catch(() => ({}));
    const items = await listItems();
    const look = await suggestLook(items, occasion);
    return NextResponse.json({ look });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Couldn't style a look" }, { status: 500 });
  }
}
