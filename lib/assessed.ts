import { notion } from "./notion";

// "Assessed Looks" database. The @notionhq client queries by database_id,
// mirroring NOTION_DB_ID in lib/notion.ts. Set NOTION_ASSESSED_DB_ID in your env.
function assessedDb(): string {
  const id = process.env.NOTION_ASSESSED_DB_ID;
  if (!id) throw new Error("NOTION_ASSESSED_DB_ID is not set (see .env.example)");
  return id;
}

// The Assess flow yields four verdicts; the Assessed Looks DB filter has three.
// Map onto the DB's options so the Saved-hub verdict filter stays clean.
export const DB_VERDICTS = ["Strong yes", "Only if", "Avoid"] as const;
export type DbVerdict = (typeof DB_VERDICTS)[number];

export function toDbVerdict(verdict: string | null | undefined): DbVerdict {
  switch (verdict) {
    case "Strong yes":
    case "Worth it":
      return "Strong yes";
    case "Skip":
    case "Avoid":
      return "Avoid";
    case "Only if":
    default:
      return "Only if";
  }
}

export function assessedTitle(input: { name?: string | null; occasion?: string | null }): string {
  return (input.name || "").trim() || (input.occasion || "").trim() || "Assessed look";
}

export type AssessedLook = {
  id: string;
  look: string;
  photo: string | null;
  verdict: string | null;
  reason: string;
  score: number | null;
  colours: string[];
  occasion: string;
  link: string | null;
  date: string | null; // Assessed (created_time)
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
function mapAssessed(page: any): AssessedLook {
  const p = page.properties;
  return {
    id: page.id,
    look: txt(p["Look"]) || "Assessed look",
    photo: fileUrl(p["Photo"]),
    verdict: p["Verdict"]?.select?.name ?? null,
    reason: txt(p["Reason"]),
    score: typeof p["Score"]?.number === "number" ? p["Score"].number : null,
    colours: (p["Colours"]?.multi_select || []).map((o: any) => o.name),
    occasion: txt(p["Occasion"]),
    link: p["Link"]?.url ?? null,
    date: page.created_time ?? null
  };
}

export async function listAssessed(): Promise<AssessedLook[]> {
  const res: any = await notion().databases.query({
    database_id: assessedDb(),
    sorts: [{ timestamp: "created_time", direction: "descending" }],
    page_size: 100
  });
  return res.results.map(mapAssessed);
}

export type NewAssessed = {
  name?: string;
  photo?: string;
  verdict?: string; // app verdict — mapped to a DB verdict on write
  reason?: string;
  score?: number;
  colours?: string[];
  occasion?: string;
  link?: string;
  pieceIds?: string[];
};

export async function createAssessed(input: NewAssessed) {
  const props: any = {
    Look: { title: [{ text: { content: assessedTitle(input) } }] },
    Verdict: { select: { name: toDbVerdict(input.verdict) } }
  };
  if (input.photo) props.Photo = { files: [{ name: "assessed", type: "external", external: { url: input.photo } }] };
  if (input.reason) props.Reason = { rich_text: [{ text: { content: input.reason.slice(0, 1900) } }] };
  if (typeof input.score === "number") props.Score = { number: input.score };
  if (input.colours?.length) props.Colours = { multi_select: input.colours.map((name) => ({ name })) };
  if (input.occasion) props.Occasion = { rich_text: [{ text: { content: input.occasion } }] };
  if (input.link) props.Link = { url: input.link };
  if (input.pieceIds?.length) props.Pieces = { relation: input.pieceIds.map((id) => ({ id })) };
  return notion().pages.create({ parent: { database_id: assessedDb() }, properties: props });
}
