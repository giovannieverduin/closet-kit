import Anthropic from "@anthropic-ai/sdk";
import { STYLE_PROFILE, DEFAULT_ASSESSMENT, type ColorAssessment } from "./profile";
import type { WardrobeItem } from "./notion";
import { CATEGORIES, CATEGORY_HINT, COLOURS, DESIGNERS, FABRICS, OCCASIONS } from "./vocab";

export type ExtractedItem = {
  name: string;
  category: string;
  colours: string[];
  designer: string;
  fabric: string[];
  occasion: string[];
  notes: string;
};

export type DetectedGarment = ExtractedItem & { frameIndex: number };

// Vision: from a sequence of video keyframes panning a closet, list each DISTINCT item
// once (deduping the same piece across consecutive frames), with the clearest frame index.
export async function extractGarmentsFromFrames(frames: { base64: string; mediaType: string }[]): Promise<DetectedGarment[]> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  const client = new Anthropic({ apiKey: key });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  const system = `You are cataloguing a wardrobe from a sequence of video frames (numbered 0 to ${frames.length - 1}) panning across a closet. Identify each DISTINCT garment, bag, or pair of shoes. The SAME item often appears across several consecutive frames — list each item ONCE. Ignore hangers, mirrors, background, body parts, and anything not a wearable item. Map attributes to the ALLOWED lists (use the closest value).

ALLOWED CATEGORY (pick one): ${CATEGORIES.join(", ")}
${CATEGORY_HINT}
ALLOWED COLOUR (pick all that apply): ${COLOURS.join(", ")}
ALLOWED FABRIC (pick all that apply): ${FABRICS.join(", ")}
ALLOWED OCCASION (pick all that fit): ${OCCASIONS.join(", ")}

Respond with ONLY a JSON array (no markdown), one object per DISTINCT item:
[{"name":"short descriptive name","category":"one ALLOWED CATEGORY","colours":["ALLOWED COLOUR"],"designer":"brand name or 'Other'","fabric":["ALLOWED FABRIC"],"occasion":["ALLOWED OCCASION"],"notes":"","frameIndex":<the frame number where this item is clearest>}]`;

  const content: any[] = [];
  frames.forEach((f, i) => {
    content.push({ type: "text", text: `Frame ${i}:` });
    content.push({ type: "image", source: { type: "base64", media_type: f.mediaType as any, data: f.base64 } });
  });
  content.push({ type: "text", text: "List every distinct wearable item across these frames, deduplicated, as the JSON array." });

  const res = await client.messages.create({ model, max_tokens: 2500, system, messages: [{ role: "user", content }] });
  const text = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .replace(/```json|```/g, "")
    .trim();
  const arr = JSON.parse(text) as DetectedGarment[];
  return arr.map((it) => ({
    ...it,
    frameIndex: Math.max(0, Math.min(frames.length - 1, Number(it.frameIndex) || 0))
  }));
}

export type FoundProduct = { productUrl: string | null; imageUrl: string | null; title: string | null; price: string | null };

// Find clean stock product listings for an item using Claude's web search. Combines a PHOTO of
// the piece (visual ID of the exact model/colourway) with the known description, and returns
// MULTIPLE candidate retailer listings for the SAME product — so the caller can try several
// pages until one yields a clean, server-fetchable image (many big retailers bot-wall fetches).
// No SERPAPI key needed.
export async function findStockProduct(input: {
  brand?: string; name?: string; colours?: string[]; category?: string;
  imageBase64?: string; mediaType?: string; productUrl?: string;
}): Promise<FoundProduct[]> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  const client = new Anthropic({ apiKey: key });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  const desc = [
    input.brand && input.brand !== "Other" ? `Brand: ${input.brand}` : "",
    input.name ? `Item: ${input.name}` : "",
    input.colours?.length ? `Colour: ${input.colours.join(", ")}` : "",
    input.category ? `Category: ${input.category}` : ""
  ].filter(Boolean).join("\n");

  const system = `You find a fashion or footwear product online so a wardrobe app can show a clean stock photo. ${input.imageBase64 ? "Use the PHOTO to confirm the exact model, colourway and details, and combine it with " : "Use "}the known description to identify the EXACT product (or the closest current match).

Use the web_search tool. Return UP TO 6 candidate listings for the SAME product across DIFFERENT retailers, ranked best-first. Each must be a DIRECT product page (never a category or search-results page). Prefer pages likely to expose a clean, fetchable product image: the brand's own site, Shopify-based stores, Net-a-Porter, MR PORTER, Nordstrom, SSENSE, Selfridges, Mytheresa, FARFETCH, END.; for sneakers also StockX, GOAT, Flight Club, Stadium Goods, Nike/SNKRS. Spreading across several retailers matters — at least one is usually fetchable.

For each candidate, include "imageUrl" ONLY if a real product image URL appears VERBATIM in the search results — never invent or construct one from an ID or pattern; use null otherwise.

Respond with ONLY a JSON object (no markdown, no prose):
{"candidates":[{"productUrl":"https://… direct product page","imageUrl":"https://… real image URL seen in results, or null","title":"product title or null","price":"price exactly as shown or null"}]}`;

  const content: any[] = [];
  if (input.imageBase64) {
    content.push({ type: "text", text: "Here is the shopper's photo of the item — identify the exact product (model + colourway) from it:" });
    content.push({ type: "image", source: { type: "base64", media_type: (input.mediaType || "image/jpeg") as any, data: input.imageBase64 } });
  }
  if (desc) content.push({ type: "text", text: `Known details:\n${desc}` });
  if (input.productUrl) content.push({ type: "text", text: `The shopper is viewing this product page, which may be region-locked or blocked to us: ${input.productUrl}\nUse the product name in that URL to identify the SAME item.` });
  content.push({ type: "text", text: "Search the web and return the JSON object with the candidates array." });

  // web_search_20250305 is the GA tool version that works on the current SDK/account.
  const res: any = await client.messages.create({
    model, max_tokens: 1500, system,
    messages: [{ role: "user", content }],
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }]
  } as any);
  const text = (res.content || [])
    .map((b: any) => (b.type === "text" ? b.text : ""))
    .join("")
    .replace(/```json|```/g, "")
    .trim();
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return [];
  try {
    const o = JSON.parse(m[0]);
    const clean = (v: any) => (typeof v === "string" && v !== "null" && v.trim() ? v.trim() : null);
    const raw = Array.isArray(o.candidates) ? o.candidates : (o.productUrl ? [o] : []);
    return raw
      .map((c: any) => ({ productUrl: clean(c.productUrl), imageUrl: clean(c.imageUrl), title: clean(c.title), price: clean(c.price) }))
      .filter((c: FoundProduct) => c.productUrl || c.imageUrl)
      .slice(0, 6);
  } catch {
    return [];
  }
}

export type OccasionLook = { title: string; itemIds: string[]; why: string };

// Styling: assemble complete outfits for an occasion from pieces she OWNS, each referenced
// by its Notion ID, and flag gaps (what's missing for this occasion). Honours STYLE_PROFILE.
export async function assembleOutfits(items: WardrobeItem[], occasion: string): Promise<{ looks: OccasionLook[]; gaps: string[] }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  const client = new Anthropic({ apiKey: key });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  const owned = items.filter((i) => i.status === "Owns");
  const digest = owned
    .map((i) => `- [${i.id}] ${i.name}${i.category ? ` (${i.category})` : ""}${i.colours.length ? ` — ${i.colours.join("/")}` : ""}${i.designer ? `, ${i.designer}` : ""}${i.occasion.length ? ` · ${i.occasion.join(", ")}` : ""}`)
    .join("\n");

  const system = `You are the wearer's personal stylist, and you speak to them directly in the second person ("you", "your"). From the pieces they OWN (each tagged with an [ID]), put together 1-3 complete outfits for the occasion they give you. Each look is a full outfit — an anchor (a dress, or a top + bottom) plus shoes, a bag, and jewellery or outerwear where it makes sense — using ONLY items from the list, referenced by their exact [ID]. Honour their style profile and occasion rules. If a look really needs something they don't own, do NOT invent it — note it under "gaps".

STYLE PROFILE (this describes you)
${STYLE_PROFILE}

WHAT YOU OWN (use the [ID] in brackets, nothing else)
${digest || "(nothing catalogued as owned yet)"}

Respond with ONLY JSON, no markdown:
{"looks":[{"title":"short look name","itemIds":["<id>","<id>"],"why":"one line, addressed to you, on why it works for this occasion and on you"}],"gaps":["short note of anything missing, e.g. 'no warm evening dress (coral or golden)' or 'no flat sandals for a boat'"]}`;

  const res = await client.messages.create({
    model,
    max_tokens: 1100,
    system,
    messages: [{ role: "user", content: `What can I wear to: ${occasion}?` }]
  });
  const text = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .replace(/```json|```/g, "")
    .trim();
  const parsed = JSON.parse(text) as { looks: OccasionLook[]; gaps: string[] };

  // Sanity filter: keep only valid owned IDs; drop any look left with nothing real.
  const ownedIds = new Set(owned.map((i) => i.id));
  const looks = (parsed.looks || [])
    .map((l) => ({ title: l.title || "Look", why: l.why || "", itemIds: (l.itemIds || []).filter((id) => ownedIds.has(id)) }))
    .filter((l) => l.itemIds.length > 0);
  return { looks, gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [] };
}

// Vision: identify a garment/bag/shoe from a photo and map attributes to the Notion vocab.
export async function extractItem(imageBase64: string, mediaType: string): Promise<ExtractedItem> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  const client = new Anthropic({ apiKey: key });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  const system = `You catalogue a fashion item from a photo for a wardrobe app. Identify the piece and map its attributes to the ALLOWED option lists EXACTLY (only use values from the lists; pick the closest match).

ALLOWED CATEGORY (pick one): ${CATEGORIES.join(", ")}
${CATEGORY_HINT}
ALLOWED COLOUR (pick all that apply): ${COLOURS.join(", ")}
DESIGNER: the brand name if you recognise it (e.g. ${DESIGNERS.slice(0, 13).join(", ")}); use "Other" only if there is no recognisable brand.
ALLOWED FABRIC (pick all that apply): ${FABRICS.join(", ")}
ALLOWED OCCASION (pick all that fit): ${OCCASIONS.join(", ")}

Respond with ONLY JSON, no markdown:
{
  "name": "short descriptive name, e.g. 'Coral one-shoulder gown' or 'Chanel flap - beige'",
  "category": "one value from ALLOWED CATEGORY",
  "colours": ["values from ALLOWED COLOUR"],
  "designer": "the brand name, or 'Other'",
  "fabric": ["values from ALLOWED FABRIC"],
  "occasion": ["values from ALLOWED OCCASION"],
  "notes": "one short styling note, or empty string"
}`;

  const res = await client.messages.create({
    model,
    max_tokens: 400,
    system,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mediaType as any, data: imageBase64 } },
        { type: "text", text: "Catalogue this item." }
      ]
    }]
  });
  const text = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .replace(/```json|```/g, "")
    .trim();
  return JSON.parse(text) as ExtractedItem;
}

export type Assessment = {
  itemGuess: string;
  verdict: "Strong yes" | "Worth it" | "Only if" | "Skip";
  confidence: number;
  colourFit: string;
  bodyFit: string;
  pairsWith: string[];
  duplicateOf: string | null;
  notes: string;
};

function wardrobeDigest(items: WardrobeItem[]): string {
  return items
    .filter((i) => i.status === "Owns")
    .map((i) => {
      const c = i.colours.join("/");
      return `- ${i.name}${i.category ? ` [${i.category}]` : ""}${c ? ` (${c})` : ""}`;
    })
    .join("\n");
}

export type Look = { title: string; pieces: string[]; rationale: string };

export async function suggestLook(items: WardrobeItem[], occasion?: string): Promise<Look> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  const client = new Anthropic({ apiKey: key });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  const system = `You are the wearer's personal stylist, and you speak to them directly in the second person ("you", "your"). Compose ONE outfit using only pieces they own${occasion ? ` for: ${occasion}` : ""}. Favour their colour strategy and flattering silhouettes; never suggest a piece not in the list. Write the rationale addressing them as "you".

STYLE PROFILE (this describes you)
${STYLE_PROFILE}

WHAT YOU OWN
${wardrobeDigest(items) || "(none on record)"}

Respond with ONLY JSON, no markdown:
{"title":"short name for the look","pieces":["exact owned piece name", 2 to 5 of them],"rationale":"one or two sentences, addressed to you, on why it works on you"}`;

  const res = await client.messages.create({
    model,
    max_tokens: 400,
    system,
    messages: [{ role: "user", content: occasion ? `Style a look for me for ${occasion}.` : "Style a look for me." }]
  });
  const text = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .replace(/```json|```/g, "")
    .trim();
  return JSON.parse(text) as Look;
}

export async function assessPhoto(
  imageBase64: string,
  mediaType: string,
  items: WardrobeItem[],
  userNote?: string
): Promise<Assessment> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  const client = new Anthropic({ apiKey: key });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  const system = `You are the wearer's personal stylist writing their private styling notes, and you address them directly in the second person ("you", "your"). Judge a garment, bag, or shoe in a photo against their styling profile and the pieces they already own. Be honest and specific, never flattering by default. Weigh colour against their colouring, cut against their body, and whether it duplicates something they have. Write every text field addressing them as "you".

STYLE PROFILE (this describes you)
${STYLE_PROFILE}

WHAT YOU ALREADY OWN
${wardrobeDigest(items) || "(none on record)"}

Respond with ONLY a JSON object, no markdown, no preamble, matching exactly:
{
  "itemGuess": "short name of the item in the photo",
  "verdict": "Strong yes" | "Worth it" | "Only if" | "Skip",
  "confidence": 0-100 integer for how sure you are,
  "colourFit": "one or two sentences, addressed to you, on how the colour reads against your colouring",
  "bodyFit": "one or two sentences, addressed to you, on cut and silhouette for your body",
  "pairsWith": ["up to 3 items you own that pair with this, by name"],
  "duplicateOf": "name of an owned piece this overlaps with, or null",
  "notes": "one or two sentences of practical advice"
}`;

  const userText = userNote
    ? `Assess this piece for me. My note: "${userNote}"`
    : "Assess this piece for me.";

  const res = await client.messages.create({
    model,
    max_tokens: 700,
    system,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType as any, data: imageBase64 }
          },
          { type: "text", text: userText }
        ]
      }
    ]
  });

  const text = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .replace(/```json|```/g, "")
    .trim();

  const parsed = JSON.parse(text) as Assessment;
  if (typeof parsed.confidence !== "number" || isNaN(parsed.confidence)) {
    const map: Record<string, number> = { "Strong yes": 90, "Worth it": 75, "Only if": 55, "Skip": 30 };
    parsed.confidence = map[parsed.verdict] ?? 60;
  }
  parsed.confidence = Math.max(0, Math.min(100, Math.round(parsed.confidence)));
  return parsed;
}

export type ReceiptItem = {
  brand: string;
  name: string;
  productUrl: string | null;
  imageUrl: string | null;
  price: string | null;
  currency: string | null;
  category: string | null;
  colours: string[];
};

// Pull fashion line-items out of a forwarded purchase/receipt email (HTML or text),
// mapping category + colours to the wardrobe vocab. Ignores shipping/tax/totals/gift cards.
export async function extractReceiptItems(emailContent: string): Promise<ReceiptItem[]> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  const client = new Anthropic({ apiKey: key });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  const system = `You extract FASHION purchase line-items from a forwarded order/receipt email (HTML or text). Return ONLY clothing, shoes, bags, jewellery, and accessories. IGNORE shipping, tax, totals, discounts, gift cards, loyalty points, and anything that is not a wearable fashion item.

Map category to the ALLOWED list and colours to the ALLOWED list (closest matches; omit a colour if unsure). Pull the product-page URL and any product image URL straight from the email when present.

ALLOWED CATEGORY (pick one): ${CATEGORIES.join(", ")}
${CATEGORY_HINT}
ALLOWED COLOUR (pick all that apply): ${COLOURS.join(", ")}

Respond with ONLY a JSON array (no markdown), one object per fashion item:
[{"brand":"brand name or ''","name":"short item name","productUrl":"product page URL or null","imageUrl":"product image URL or null","price":"number as a string or null","currency":"e.g. USD, EUR, AED or null","category":"one ALLOWED CATEGORY or null","colours":["ALLOWED COLOUR"]}]
If there are no fashion items, return [].`;

  // Keep the prompt bounded for very long HTML emails.
  const content = emailContent.length > 60000 ? emailContent.slice(0, 60000) : emailContent;

  const res = await client.messages.create({
    model,
    max_tokens: 1500,
    system,
    messages: [{ role: "user", content: `Extract the fashion items from this email:\n\n${content}` }]
  });
  const txt = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .replace(/```json|```/g, "")
    .trim();

  let arr: any[];
  try {
    arr = JSON.parse(txt);
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((it) => it && it.name)
    .map((it) => ({
      brand: String(it.brand || ""),
      name: String(it.name),
      productUrl: it.productUrl || null,
      imageUrl: it.imageUrl || null,
      price: it.price != null ? String(it.price) : null,
      currency: it.currency || null,
      category: it.category || null,
      colours: Array.isArray(it.colours) ? it.colours.map(String) : []
    }));
}

// Same as extractReceiptItems, but reads SCREENSHOT(S) of an order confirmation / receipt
// (vision). Multiple screenshots are treated as pages of the SAME order and de-duplicated.
export async function extractReceiptItemsFromImages(images: { base64: string; mediaType: string }[]): Promise<ReceiptItem[]> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  const client = new Anthropic({ apiKey: key });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  const system = `You extract FASHION purchase line-items from SCREENSHOT(S) of an order confirmation or receipt. Return ONLY clothing, shoes, bags, jewellery, and accessories. IGNORE shipping, tax, totals, discounts, gift cards, loyalty points, addresses, and anything that is not a wearable fashion item. The screenshots may be different parts of the SAME order — combine them and never list the same item twice.

Map category to the ALLOWED list and colours to the ALLOWED list (closest matches; omit a colour if unsure). Only include a product URL or image URL if it is literally written out in the screenshot; otherwise null.

ALLOWED CATEGORY (pick one): ${CATEGORIES.join(", ")}
${CATEGORY_HINT}
ALLOWED COLOUR (pick all that apply): ${COLOURS.join(", ")}

Respond with ONLY a JSON array (no markdown), one object per fashion item:
[{"brand":"brand name or ''","name":"short item name","productUrl":"product page URL or null","imageUrl":"product image URL or null","price":"number as a string or null","currency":"e.g. USD, EUR, AED or null","category":"one ALLOWED CATEGORY or null","colours":["ALLOWED COLOUR"]}]
If there are no fashion items, return [].`;

  const content: any[] = [];
  images.forEach((im) => content.push({ type: "image", source: { type: "base64", media_type: im.mediaType as any, data: im.base64 } }));
  content.push({ type: "text", text: "Extract the fashion items purchased in these screenshots as the JSON array." });

  const res = await client.messages.create({ model, max_tokens: 1500, system, messages: [{ role: "user", content }] });
  const txt = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .replace(/```json|```/g, "")
    .trim();

  let arr: any[];
  try { arr = JSON.parse(txt); } catch { return []; }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((it) => it && it.name)
    .map((it) => ({
      brand: String(it.brand || ""),
      name: String(it.name),
      productUrl: it.productUrl || null,
      imageUrl: it.imageUrl || null,
      price: it.price != null ? String(it.price) : null,
      currency: it.currency || null,
      category: it.category || null,
      colours: Array.isArray(it.colours) ? it.colours.map(String) : []
    }));
}

// Read a photo of a colour analysis (result sheet, draping fan, or a clear,
// well-lit portrait) and return a structured ColorAssessment for the Palette page.
export async function extractColorAssessment(
  imageBase64: string,
  mediaType: string
): Promise<ColorAssessment> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  const client = new Anthropic({ apiKey: key });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  const system = `You are a professional seasonal colour analyst. From the supplied image — which may be a colour-analysis result sheet, a draping swatch fan, or a clear, well-lit photo of a person — produce a structured personal colour assessment. Infer the season and palette as a trained analyst would. Use real, usable hex values for every swatch. Be decisive but honest; if the image is a weak basis, still give your best reasoned assessment.

Respond with ONLY a JSON object, no markdown, no preamble, matching exactly:
{
  "season": "e.g. Warm Spring, Cool Winter, Soft Summer",
  "source": "short provenance line, e.g. 'Uploaded colour analysis'",
  "toneLine": "exactly three words joined by ' · ', e.g. 'Warm · Clear · Light'",
  "tagline": "one encouraging sentence addressed to 'you' about your palette",
  "axes": [
    {"dim":"Undertone / Hue","value":"..."},
    {"dim":"Depth / Value","value":"..."},
    {"dim":"Clarity / Chroma","value":"..."},
    {"dim":"Contrast","value":"..."}
  ],
  "features": ["three short descriptors of colouring, e.g. 'Blue eyes'"],
  "colorGroups": [
    {"key":"flatter","label":"Colours that flatter you most","swatches":[{"name":"Coral","hex":"#FB7A5B"} (exactly 6)]},
    {"key":"brights","label":"More clear brights","swatches":[6 swatches]},
    {"key":"neutrals","label":"Your best neutrals","swatches":[6 swatches]},
    {"key":"washout","label":"Colours that wash you out","tone":"avoid","swatches":[5 swatches]}
  ],
  "metals": [{"name":"Gold","hex":"#D4A92A","note":"short"} (3 to 4)],
  "patterns": [{"name":"Floral","note":"short"} (3 to 4)]
}`;

  const res = await client.messages.create({
    model,
    max_tokens: 1600,
    system,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType as any, data: imageBase64 } },
          { type: "text", text: "Analyse this and return my colour assessment as specified." }
        ]
      }
    ]
  });

  const text = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .replace(/```json|```/g, "")
    .trim();
  const parsed = JSON.parse(text) as Partial<ColorAssessment>;

  // Defensive: fall back to the example for any field the model omitted, so the
  // Palette UI never renders an empty/broken section.
  return {
    season: parsed.season || DEFAULT_ASSESSMENT.season,
    source: parsed.source || "Uploaded colour analysis",
    toneLine: parsed.toneLine || DEFAULT_ASSESSMENT.toneLine,
    tagline: parsed.tagline || DEFAULT_ASSESSMENT.tagline,
    axes: parsed.axes?.length ? parsed.axes : DEFAULT_ASSESSMENT.axes,
    features: parsed.features?.length ? parsed.features : DEFAULT_ASSESSMENT.features,
    colorGroups: parsed.colorGroups?.length ? parsed.colorGroups : DEFAULT_ASSESSMENT.colorGroups,
    metals: parsed.metals?.length ? parsed.metals : DEFAULT_ASSESSMENT.metals,
    patterns: parsed.patterns?.length ? parsed.patterns : DEFAULT_ASSESSMENT.patterns
  };
}
