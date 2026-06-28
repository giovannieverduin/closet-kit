import { NextRequest, NextResponse } from "next/server";
import { fetchProductMeta, upgradeImageUrl } from "@/lib/product";
import { findStockProduct } from "@/lib/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Reverse image search adapter. Default: SerpAPI Google Lens (products).
// Swap by setting REVERSE_IMAGE_API_URL. Returns the best matching product page URL.
async function reverseImageSearch(imageUrl: string): Promise<string | null> {
  const key = process.env.SERPAPI_KEY;
  if (!key) return null;
  const url =
    process.env.REVERSE_IMAGE_API_URL ||
    `https://serpapi.com/search.json?engine=google_lens&type=products&url=${encodeURIComponent(imageUrl)}&api_key=${key}`;
  const res = await fetch(url);
  const data: any = await res.json().catch(() => ({}));
  const match = data?.visual_matches?.[0] || data?.products?.[0] || null;
  return match?.link || match?.source || null;
}

// POST { productUrl?, imageUrl?, imageBase64?, mediaType?, brand?, name?, colours?, category? }
// Resolution order:
//   1. productUrl     -> fetch a clean product image + title + price from that page.
//   2. imageUrl (hosted snapshot) + SERPAPI -> reverse image search -> fetch the match's meta.
//   3. description and/or imageBase64 -> Claude web search finds the product page (no SERPAPI),
//      then we pull the clean og:image (falling back to a direct image URL the search surfaced).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productUrl, imageUrl, imageBase64, mediaType, brand, name, colours, category } = body || {};

    const ok = (image: string, title: string | null, price: string | null, sourceUrl: string) =>
      NextResponse.json({ title, image: upgradeImageUrl(image), price, sourceUrl });

    // 1. Direct product link — try to pull the page's clean image first. Many retailers (Ounass,
    //    Farfetch, NET-A-PORTER, sneaker sites…) bot-wall server fetches or hide the product image,
    //    so if this yields nothing we DON'T stop — we fall through to web search below.
    if (productUrl) {
      try {
        const meta = await fetchProductMeta(productUrl);
        if (meta.image) return ok(meta.image, meta.title, meta.price, meta.sourceUrl);
      } catch { /* blocked — fall through */ }
    }

    // 2. Reverse image search from a hosted snapshot (needs SERPAPI_KEY).
    if (imageUrl) {
      const u = await reverseImageSearch(imageUrl);
      if (u) {
        try { const meta = await fetchProductMeta(u); if (meta.image) return ok(meta.image, meta.title, meta.price, meta.sourceUrl); } catch {}
      }
    }

    // 3. Web search (photo + description + link hint) -> several candidate retailers. Fetch them
    //    in parallel and take the highest-ranked one that yields a clean image.
    let candidates: Awaited<ReturnType<typeof findStockProduct>> = [];
    if (productUrl || brand || name || (Array.isArray(colours) && colours.length) || category || imageBase64) {
      candidates = await findStockProduct({ brand, name, colours, category, imageBase64, mediaType, productUrl });
    }
    if (candidates.length) {
      const metas = await Promise.allSettled(
        candidates.map((c) => (c.productUrl ? fetchProductMeta(c.productUrl) : Promise.reject(new Error("no url"))))
      );
      for (let i = 0; i < candidates.length; i++) {
        const r = metas[i];
        if (r.status === "fulfilled" && r.value.image) {
          const c = candidates[i];
          return ok(r.value.image, c.title || r.value.title, c.price || r.value.price, c.productUrl || r.value.sourceUrl);
        }
      }
      // No page yielded a fetchable image — fall back to a direct image URL the search surfaced.
      const withImg = candidates.find((c) => c.imageUrl);
      if (withImg?.imageUrl) return ok(withImg.imageUrl, withImg.title, withImg.price, withImg.productUrl || "");
    }

    return NextResponse.json(
      { error: "Couldn't find a clean product image. Add a product link, or refine the brand / name." },
      { status: 404 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "find-product failed" }, { status: 500 });
  }
}
