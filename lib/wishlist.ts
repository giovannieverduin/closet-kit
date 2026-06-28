import { notion } from "./notion";

const WISHLIST_DB = process.env.NOTION_WISHLIST_DB_ID;

export type StylingPiece = { brand: string; name: string; price: string; link: string };

export type WishlistItem = {
  id: string;
  brand: string;
  name: string;
  price: string;
  link: string | null;
  category: string;
  archetype: string;
  onBody: string | null; // On-Body Photo file url
  productImage: string | null; // Product Image file url
  styling: StylingPiece[];
  note: string;
  priority: string | null; // "Really want" | "Maybe"
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function txt(prop: any): string {
  if (prop?.type === "rich_text") return (prop.rich_text || []).map((t: any) => t.plain_text).join("");
  if (prop?.type === "title") return (prop.title || []).map((t: any) => t.plain_text).join("");
  return "";
}
function fileUrl(prop: any): string | null {
  const f = (prop?.files || [])[0];
  if (!f) return null;
  return f.type === "external" ? f.external?.url ?? null : f.file?.url ?? null;
}

// Pure helpers (unit-tested).
export function wishlistTitle(input: { brand?: string; name?: string }): string {
  const parts = [input.brand, input.name].map((s) => (s || "").trim()).filter(Boolean);
  if (parts.length === 2) return `${parts[0]} — ${parts[1]}`;
  return parts[0] || "Wishlist item";
}
export function stylingToJson(pieces: StylingPiece[] | undefined): string {
  if (!pieces?.length) return "";
  return JSON.stringify(
    pieces.map((p) => ({ brand: p.brand || "", name: p.name || "", price: p.price || "", link: p.link || "" }))
  );
}
export function jsonToStyling(raw: string | undefined): StylingPiece[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((p) => p && typeof p === "object")
      .map((p: any) => ({ brand: String(p.brand || ""), name: String(p.name || ""), price: String(p.price || ""), link: String(p.link || "") }));
  } catch {
    return [];
  }
}

function mapPage(page: any): WishlistItem {
  const p = page.properties;
  return {
    id: page.id,
    brand: txt(p["Brand"]),
    name: txt(p["Item"]).replace(/^.*\s—\s/, "") || txt(p["Item"]),
    price: txt(p["Price"]),
    link: p["Link"]?.url ?? null,
    category: txt(p["Category"]),
    archetype: txt(p["Archetype"]),
    onBody: fileUrl(p["On-Body Photo"]),
    productImage: fileUrl(p["Product Image"]),
    styling: jsonToStyling(txt(p["Styling"])),
    note: txt(p["Note"]),
    priority: p["Priority"]?.select?.name ?? null
  };
}

function dbId(): string {
  if (!WISHLIST_DB) throw new Error("NOTION_WISHLIST_DB_ID is not set");
  return WISHLIST_DB;
}

export type NewWishlistItem = {
  brand: string;
  name: string;
  price?: string;
  link?: string;
  category?: string;
  archetype?: string;
  onBody?: string; // public URL for the generated try-on image
  productImage?: string; // public URL for the flat product image
  styling?: StylingPiece[];
  note?: string;
  priority?: string;
};

function fileProp(url: string | undefined, label: string) {
  return url ? { files: [{ name: label, type: "external", external: { url } }] } : undefined;
}

export async function listWishlist(): Promise<WishlistItem[]> {
  const res: any = await notion().databases.query({
    database_id: dbId(),
    sorts: [{ timestamp: "created_time", direction: "descending" }],
    page_size: 100
  });
  return res.results.map(mapPage);
}

// Returns the existing page id if an item with this product link is already saved.
export async function findByLink(link: string): Promise<string | null> {
  if (!link) return null;
  const res: any = await notion().databases.query({
    database_id: dbId(),
    filter: { property: "Link", url: { equals: link } },
    page_size: 1
  });
  return res.results[0]?.id ?? null;
}

export async function createWishlistItem(input: NewWishlistItem) {
  const props: any = {
    Item: { title: [{ text: { content: wishlistTitle(input) } }] }
  };
  if (input.brand) props.Brand = { rich_text: [{ text: { content: input.brand } }] };
  if (input.price) props.Price = { rich_text: [{ text: { content: input.price } }] };
  if (input.link) props.Link = { url: input.link };
  if (input.category) props.Category = { rich_text: [{ text: { content: input.category } }] };
  if (input.archetype) props.Archetype = { rich_text: [{ text: { content: input.archetype } }] };
  const onBody = fileProp(input.onBody, "on-body");
  if (onBody) props["On-Body Photo"] = onBody;
  const product = fileProp(input.productImage, "product");
  if (product) props["Product Image"] = product;
  const styling = stylingToJson(input.styling);
  if (styling) props.Styling = { rich_text: [{ text: { content: styling } }] };
  if (input.note) props.Note = { rich_text: [{ text: { content: input.note } }] };
  props.Priority = { select: { name: input.priority || "Maybe" } };
  return notion().pages.create({ parent: { database_id: dbId() }, properties: props });
}

export async function updateWishlistItem(id: string, patch: { note?: string; priority?: string }) {
  const props: any = {};
  if (patch.note !== undefined) props.Note = { rich_text: patch.note ? [{ text: { content: patch.note } }] : [] };
  if (patch.priority !== undefined) props.Priority = { select: { name: patch.priority } };
  return notion().pages.update({ page_id: id, properties: props });
}

export async function archiveWishlistItem(id: string) {
  return notion().pages.update({ page_id: id, archived: true });
}

export async function getWishlistItem(id: string): Promise<WishlistItem> {
  const page: any = await notion().pages.retrieve({ page_id: id });
  return mapPage(page);
}

export async function getWishlistPhoto(id: string): Promise<string | null> {
  const page: any = await notion().pages.retrieve({ page_id: id });
  return fileUrl(page.properties?.["On-Body Photo"]) ?? null;
}
