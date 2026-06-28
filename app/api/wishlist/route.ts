import { NextRequest, NextResponse } from "next/server";
import { listWishlist, createWishlistItem, findByLink, type StylingPiece } from "@/lib/wishlist";
import { blobUrlForPath } from "@/lib/reference";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await listWishlist();
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to load wishlist" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const product = body?.product || {};
    if (!product.name && !product.brand) {
      return NextResponse.json({ error: "Nothing to save" }, { status: 400 });
    }

    // Don't save the same product twice.
    if (product.link) {
      const existing = await findByLink(product.link);
      if (existing) return NextResponse.json({ ok: true, duplicate: true, id: existing });
    }

    // Resolve the generated try-on image (saved to Blob by /api/tryon) to a public URL.
    let onBody: string | undefined;
    if (body?.tryonPathname) {
      onBody = (await blobUrlForPath(body.tryonPathname)) || undefined;
    }

    const styling: StylingPiece[] = Array.isArray(product.accessories)
      ? product.accessories.map((a: any) => ({ brand: a.brand || "", name: a.name || "", price: a.price || "", link: a.link || "" }))
      : [];

    const page = await createWishlistItem({
      brand: product.brand || "",
      name: product.name || "",
      price: product.price || "",
      link: product.link || "",
      category: product.category || "",
      archetype: product.archetype || "",
      onBody,
      productImage: product.productImage || "",
      styling,
      priority: "Maybe"
    });
    return NextResponse.json({ ok: true, id: (page as any).id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to save to wishlist" }, { status: 500 });
  }
}
