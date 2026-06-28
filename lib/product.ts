// Fetches a retailer/product page and pulls a clean product image + title + price
// from Open Graph tags, with a JSON-LD Product fallback. Used by the receipt importer
// (clean image for an imported purchase) and the "find the original product image" route.

import { safePublicUrl } from "./safeUrl";

export type ProductMeta = {
  title: string | null;
  image: string | null;
  price: string | null;
  sourceUrl: string;
};

function metaTag(html: string, prop: string): string | null {
  const a = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"));
  if (a) return a[1];
  const b = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i"));
  return b ? b[1] : null;
}

export async function fetchProductMeta(rawUrl: string): Promise<ProductMeta> {
  const url = safePublicUrl(rawUrl);
  if (!url) throw new Error("Unsafe or invalid product URL");
  // A realistic browser UA + Accept headers get past some (not all) bot walls.
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9"
    },
    redirect: "follow",
    signal: AbortSignal.timeout(12000)
  });
  const html = (await res.text()).slice(0, 1_500_000); // cap parse size

  let title = metaTag(html, "og:title");
  let image = metaTag(html, "og:image");
  let price = metaTag(html, "product:price:amount") || metaTag(html, "og:price:amount");

  // JSON-LD Product fallback for anything Open Graph missed.
  if (!image || !price || !title) {
    const blocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
    for (const blk of blocks) {
      try {
        const data = JSON.parse(blk[1].trim());
        const nodes = Array.isArray(data) ? data : (data["@graph"] || [data]);
        for (const n of nodes) {
          const types = Array.isArray(n?.["@type"]) ? n["@type"] : [n?.["@type"]];
          if (types.includes("Product")) {
            if (!title && n.name) title = n.name;
            if (!image && n.image) image = Array.isArray(n.image) ? n.image[0] : (n.image.url || n.image);
            const offer = Array.isArray(n.offers) ? n.offers[0] : n.offers;
            if (!price && offer?.price) price = String(offer.price);
          }
        }
      } catch {
        // ignore malformed JSON-LD
      }
    }
  }

  if (image && image.startsWith("//")) image = "https:" + image;
  if (image && image.startsWith("http://")) image = "https://" + image.slice("http://".length); // avoid mixed content
  return { title: title || null, image: image || null, price: price || null, sourceUrl: url };
}

// Best-effort upgrade of a product image URL to a higher-resolution, https version. Order-
// confirmation emails embed tiny cached thumbnails (e.g. Magento's /cache/<hash>/ resizes) and
// http URLs, which look awful in the closet. This rewrites only well-known, safe patterns and
// never invents a URL — an unrecognised one is returned unchanged (just https-ified).
export function upgradeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let u = String(url).trim();
  if (!u) return null;
  if (u.startsWith("//")) u = "https:" + u;
  u = u.replace(/^http:\/\//i, "https://");
  // Magento media cache: the full-res original lives at the same path minus /cache/<hash>/.
  u = u.replace(/\/media\/catalog\/product\/cache\/[0-9a-f]{16,}\//i, "/media/catalog/product/");
  // Ounass/atgcdn on-the-fly resizer, e.g. /small_light(dw=240,of=webp)/pub/media/… → original.
  u = u.replace(/\/small_light\([^)]*\)\//i, "/");
  return u;
}
