import { NextRequest, NextResponse } from "next/server";
import { looksByItem } from "@/lib/looks";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const itemId = req.nextUrl.searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
  try {
    const looks = await looksByItem(itemId);
    return NextResponse.json({ looks });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
