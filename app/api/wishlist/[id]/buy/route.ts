import { NextRequest, NextResponse } from "next/server";
import { getWishlistItem, archiveWishlistItem } from "@/lib/wishlist";
import { createItem } from "@/lib/notion";

export const dynamic = "force-dynamic";

// "I bought this": move the wishlist item into the closet as an owned piece, then
// archive the wishlist row so it leaves the wishlist.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const w = await getWishlistItem(params.id);
    const name = [w.brand, w.name].filter(Boolean).join(" ") || w.name || "New piece";
    const created = await createItem({
      name,
      category: w.category || undefined,
      status: "Owns",
      link: w.link || undefined,
      photo: w.productImage || w.onBody || undefined
    });
    await archiveWishlistItem(params.id);
    return NextResponse.json({ ok: true, itemId: (created as any).id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to mark as bought" }, { status: 500 });
  }
}
