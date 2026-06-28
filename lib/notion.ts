import { Client } from "@notionhq/client";

function dbId(): string {
  const id = process.env.NOTION_DB_ID;
  if (!id) throw new Error("NOTION_DB_ID is not set (see .env.example)");
  return id;
}

export function notion() {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error("NOTION_TOKEN is not set");
  return new Client({ auth: token });
}

export type WardrobeItem = {
  id: string;
  name: string;
  category: string | null;
  status: string | null;
  loveLevel: string | null;
  colours: string[];
  designer: string | null;
  occasion: string[];
  season: string[];
  fabric: string[];
  fit: string[];
  notes: string;
  link: string | null;
  photo: string | null;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function txt(prop: any): string {
  if (!prop) return "";
  if (prop.type === "title") return (prop.title || []).map((t: any) => t.plain_text).join("");
  if (prop.type === "rich_text") return (prop.rich_text || []).map((t: any) => t.plain_text).join("");
  return "";
}
function sel(prop: any): string | null {
  return prop?.select?.name ?? null;
}
function multi(prop: any): string[] {
  return (prop?.multi_select || []).map((o: any) => o.name);
}
function fileUrl(prop: any): string | null {
  const f = (prop?.files || [])[0];
  if (!f) return null;
  return f.type === "external" ? f.external?.url ?? null : f.file?.url ?? null;
}

function mapPage(page: any): WardrobeItem {
  const p = page.properties;
  return {
    id: page.id,
    name: txt(p["Item"]) || "Untitled",
    category: sel(p["Category"]),
    status: sel(p["Status"]),
    loveLevel: sel(p["Love Level"]),
    colours: multi(p["Colour"]),
    designer: sel(p["Designer"]),
    occasion: multi(p["Occasion"]),
    season: multi(p["Season"]),
    fabric: multi(p["Fabric / Material"]),
    fit: multi(p["Fit / Silhouette"]),
    notes: txt(p["Styling Notes"]),
    link: p["Link"]?.url ?? null,
    photo: fileUrl(p["Photo"])
  };
}

export async function listItems(): Promise<WardrobeItem[]> {
  const client = notion();
  const items: WardrobeItem[] = [];
  let cursor: string | undefined = undefined;
  do {
    const res: any = await client.databases.query({
      database_id: dbId(),
      start_cursor: cursor,
      page_size: 100
    });
    res.results.forEach((r: any) => items.push(mapPage(r)));
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return items;
}

export type NewItem = {
  name: string;
  category?: string;
  status?: string;
  colours?: string[];
  occasion?: string[];
  designer?: string;
  fabric?: string[];
  season?: string[];
  notes?: string;
  link?: string;
  photo?: string;
};

export async function createItem(item: NewItem) {
  const client = notion();
  const props: any = {
    Item: { title: [{ text: { content: item.name } }] }
  };
  if (item.category) props.Category = { select: { name: item.category } };
  props.Status = { select: { name: item.status || "Wishlist" } };
  if (item.colours?.length) props.Colour = { multi_select: item.colours.map((n) => ({ name: n })) };
  if (item.occasion?.length) props.Occasion = { multi_select: item.occasion.map((n) => ({ name: n })) };
  if (item.designer) props.Designer = { select: { name: item.designer } };
  if (item.fabric?.length) props["Fabric / Material"] = { multi_select: item.fabric.map((n) => ({ name: n })) };
  if (item.season?.length) props.Season = { multi_select: item.season.map((n) => ({ name: n })) };
  if (item.notes) props["Styling Notes"] = { rich_text: [{ text: { content: item.notes } }] };
  if (item.link) props.Link = { url: item.link };
  if (item.photo) props.Photo = { files: [{ name: (item.name || "photo").slice(0, 90), type: "external", external: { url: item.photo } }] };

  return client.pages.create({ parent: { database_id: dbId() }, properties: props });
}

export async function getItem(id: string): Promise<WardrobeItem> {
  const page: any = await notion().pages.retrieve({ page_id: id });
  return mapPage(page);
}

// Partial update — only the provided fields are written.
export async function updateItem(id: string, item: Partial<NewItem>) {
  const props: any = {};
  if (item.name !== undefined) props.Item = { title: [{ text: { content: item.name } }] };
  if (item.category !== undefined) props.Category = item.category ? { select: { name: item.category } } : { select: null };
  if (item.status !== undefined) props.Status = item.status ? { select: { name: item.status } } : { select: null };
  if (item.designer !== undefined) props.Designer = item.designer ? { select: { name: item.designer } } : { select: null };
  if (item.colours !== undefined) props.Colour = { multi_select: (item.colours || []).map((n) => ({ name: n })) };
  if (item.occasion !== undefined) props.Occasion = { multi_select: (item.occasion || []).map((n) => ({ name: n })) };
  if (item.fabric !== undefined) props["Fabric / Material"] = { multi_select: (item.fabric || []).map((n) => ({ name: n })) };
  if (item.season !== undefined) props.Season = { multi_select: (item.season || []).map((n) => ({ name: n })) };
  if (item.notes !== undefined) props["Styling Notes"] = { rich_text: item.notes ? [{ text: { content: item.notes } }] : [] };
  if (item.link !== undefined) props.Link = { url: item.link || null };
  if (item.photo !== undefined) {
    props.Photo = item.photo
      ? { files: [{ name: (item.name || "photo").slice(0, 90), type: "external", external: { url: item.photo } }] }
      : { files: [] };
  }
  return notion().pages.update({ page_id: id, properties: props });
}

export async function archiveItem(id: string) {
  return notion().pages.update({ page_id: id, archived: true });
}

// Soft archive/restore via the Status select — reversible, unlike archiveItem()
// which trashes the Notion page. Writing a not-yet-existing option (e.g.
// "Archived") auto-creates it in the Wardrobe DB on first write, so no schema
// edit is needed. Runs the updates in parallel; resolves once all have landed.
export async function bulkSetStatus(ids: string[], status: string) {
  const client = notion();
  await Promise.all(
    ids.map((id) =>
      client.pages.update({ page_id: id, properties: { Status: { select: { name: status } } } })
    )
  );
  return { updated: ids.length };
}
