import { notion } from "./notion";

const LOOKS_DB = process.env.NOTION_LOOKS_DB_ID;

export type WearLook = {
  id: string;
  occasion: string;   // event or place
  wornWith: string;   // who she was with
  date: string | null; // Date Captured
  photo: string | null; // first Photo file url
  tags: string[];
  rating: number | null; // 1 = meh, 5 = love this
  pieceIds: string[]; // related wardrobe pages
  notes: string;
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

function mapLook(page: any): WearLook {
  const p = page.properties;
  return {
    id: page.id,
    occasion: txt(p["Occasion"]),
    wornWith: txt(p["Worn With"]),
    date: p["Date Captured"]?.date?.start ?? null,
    photo: fileUrl(p["Photo"]),
    tags: (p["Tags"]?.multi_select || []).map((o: any) => o.name),
    rating: typeof p["Rating"]?.number === "number" ? p["Rating"].number : null,
    pieceIds: (p["Pieces"]?.relation || []).map((r: any) => r.id),
    notes: txt(p["Notes"])
  };
}

function dbId(): string {
  if (!LOOKS_DB) throw new Error("NOTION_LOOKS_DB_ID is not set");
  return LOOKS_DB;
}

// Auto-title: "{Date Captured} - {first tag or Occasion}", falling back to "Look".
export function lookTitle(input: { date?: string | null; tags?: string[]; occasion?: string }): string {
  const label = (input.tags && input.tags[0]) || input.occasion || "";
  const parts = [input.date || "", label].map((s) => (s || "").trim()).filter(Boolean);
  return parts.length ? parts.join(" - ") : "Look";
}

export async function listLooks(): Promise<WearLook[]> {
  const res: any = await notion().databases.query({
    database_id: dbId(),
    sorts: [{ property: "Date Captured", direction: "descending" }],
    page_size: 100
  });
  return res.results.map(mapLook);
}

export type NewLook = {
  photo?: string;
  tags?: string[];
  rating?: number;
  date?: string; // Date Captured
  wornWith?: string;
  occasion?: string;
  pieceIds?: string[];
  notes?: string;
};

export async function createLook(input: NewLook) {
  const props: any = {
    Look: { title: [{ text: { content: lookTitle(input) } }] }
  };
  // Photo as a file property with an external (Blob) URL — mirrors createItem's Photo write.
  if (input.photo) {
    props.Photo = { files: [{ name: "look", type: "external", external: { url: input.photo } }] };
  }
  if (input.tags?.length) props.Tags = { multi_select: input.tags.map((name) => ({ name })) };
  if (typeof input.rating === "number") props.Rating = { number: input.rating };
  if (input.date) props["Date Captured"] = { date: { start: input.date } };
  if (input.wornWith) props["Worn With"] = { rich_text: [{ text: { content: input.wornWith } }] };
  if (input.occasion) props.Occasion = { rich_text: [{ text: { content: input.occasion } }] };
  if (input.pieceIds?.length) props.Pieces = { relation: input.pieceIds.map((id) => ({ id })) };
  if (input.notes) props.Notes = { rich_text: [{ text: { content: input.notes } }] };
  return notion().pages.create({ parent: { database_id: dbId() }, properties: props });
}

export async function looksByItem(itemId: string): Promise<WearLook[]> {
  const res: any = await notion().databases.query({
    database_id: dbId(),
    filter: { property: "Pieces", relation: { contains: itemId } },
    sorts: [{ property: "Date Captured", direction: "descending" }]
  });
  return res.results.map(mapLook);
}

export async function getLookPhoto(lookId: string): Promise<string | null> {
  const page: any = await notion().pages.retrieve({ page_id: lookId });
  return fileUrl(page.properties?.Photo) ?? null;
}
