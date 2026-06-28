// ─────────────────────────────────────────────────────────────────────────
// EXAMPLE STYLE PROFILE — replace this with your own.
//
// This file is the single source of truth for "who the wardrobe is for": the
// colour analysis, measurements, and silhouette rules the AI stylist uses.
// The values below are a NEUTRAL EXAMPLE only — they describe no real person.
// Edit STYLE_PROFILE, ANALYSIS, COLOR_GROUPS, METALS and PATTERNS to match your
// own colouring and body. A professional colour analysis (e.g. seasonal
// draping) gives the best results, but any honest self-assessment works.
// ─────────────────────────────────────────────────────────────────────────

export const STYLE_PROFILE = `
SUBJECT: (example wearer — replace with your own profile).
SEASON / PALETTE: warm, light, clear (example). Undertone: warm. Value: light to medium. Chroma: clear.
MEASUREMENTS: fill in your own (height, build, sizes for tops / bottoms / shoes). Leave out anything you'd rather not store.
BUILD NOTES: describe your proportions and what you like to emphasise or balance.

COLOUR STRATEGY (example — warm, clear and light)
- Flatter most: coral, peach, golden yellow, warm turquoise, leaf green, warm coral-red.
- Clear brights: salmon, mango, apricot, aqua, warm periwinkle, clear warm blue.
- Best neutrals: ivory, cream, warm beige, camel, golden tan, warm brown.
- Metals: gold and rose gold. Accessories: tan leather, tortoiseshell.
- Go easy on: black near the face, cool greys, muted/dusty tones, icy pastels.

FABRICS THAT WORK (example): silk, georgette, fine crepe and jersey, lace, linen and cotton for day.

SILHOUETTES (example): define the waist; bias-cut and column for length; fit-and-flare from the waist.
Adjust all of the above to your own shape and preferences.

OCCASION RULES (example, wedding guest): never white/ivory/cream at someone's wedding; cover shoulders
for a church; block heel or wedge for grass/garden venues; flats for boats.
`.trim();

export type Swatch = { name: string; hex: string; note?: string };

// User-facing copy stays in the app's companion second-person voice ("you/your").
// These are EXAMPLE values — edit them to reflect your own analysis.
export const ANALYSIS = {
  season: "Warm Spring (example)",
  source: "Replace with your own colour analysis",
  tagline: "Example palette: warm, clear, light colours. Edit lib/profile.ts to make it yours.",
  axes: [
    { dim: "Undertone / Hue", value: "Warm (example)" },
    { dim: "Depth / Value", value: "Light to medium (example)" },
    { dim: "Clarity / Chroma", value: "Clear and bright (example)" },
    { dim: "Contrast", value: "Low to medium (example)" }
  ],
  features: ["Edit lib/profile.ts", "to describe", "your own colouring"]
};

export const COLOR_GROUPS: { key: string; label: string; tone?: "avoid"; swatches: Swatch[] }[] = [
  {
    key: "flatter", label: "Colours that flatter you most",
    swatches: [
      { name: "Coral", hex: "#FB7A5B" },
      { name: "Peach", hex: "#F6A877" },
      { name: "Golden Yellow", hex: "#F2B33C" },
      { name: "Warm Turquoise", hex: "#28B6AE" },
      { name: "Leaf Green", hex: "#80B24C" },
      { name: "Warm Coral-Red", hex: "#EB5A40" }
    ]
  },
  {
    key: "brights", label: "More clear brights",
    swatches: [
      { name: "Salmon", hex: "#F98E78" },
      { name: "Mango", hex: "#F4A130" },
      { name: "Apricot", hex: "#F5B879" },
      { name: "Aqua", hex: "#4FC2BD" },
      { name: "Warm Periwinkle", hex: "#6E8FE0" },
      { name: "Clear Warm Blue", hex: "#3F9BD8" }
    ]
  },
  {
    key: "neutrals", label: "Your best neutrals (warm)",
    swatches: [
      { name: "Ivory", hex: "#F4EEDD" },
      { name: "Cream", hex: "#F1E6C9" },
      { name: "Warm Beige", hex: "#DDC6A3" },
      { name: "Camel", hex: "#C49A63" },
      { name: "Golden Tan", hex: "#C9A152" },
      { name: "Golden Brown", hex: "#7A5234" }
    ]
  },
  {
    key: "washout", label: "Colours that wash you out", tone: "avoid",
    swatches: [
      { name: "Black", hex: "#161616" },
      { name: "Cool Grey", hex: "#A7ADB5" },
      { name: "Burgundy", hex: "#6E2433" },
      { name: "Dusty Mauve", hex: "#B596A0" },
      { name: "Icy Cool Blue", hex: "#BFD3E6" }
    ]
  }
];

export const METALS: Swatch[] = [
  { name: "Gold", hex: "#D4A92A", note: "Example metal." },
  { name: "Rose Gold", hex: "#E3A88F", note: "Warm and soft." },
  { name: "Tan Leather", hex: "#A6743F", note: "Bags, belts, straps." },
  { name: "Tortoiseshell", hex: "#6B4226", note: "Frames, clips, buttons." }
];

export type PatternRule = { name: string; note: string };
export const PATTERNS: PatternRule[] = [
  { name: "Floral", note: "Warm, clear florals (example)." },
  { name: "Watercolour", note: "Soft warm washes, kept fresh not muddy." },
  { name: "Soft Stripes", note: "Warm or tonal, low contrast." },
  { name: "Polka Dots", note: "Classic, on a warm ground." }
];

// Example palette-tier mapping for the closet/Add view. Edit the sets to match
// your own analysis (which colour names are best / neutral / to use with caution).
export type PaletteTier = "best" | "neutral" | "caution";
const BEST = new Set(["Coral", "Peach", "Apricot", "Salmon", "Mango", "Golden Yellow", "Butter Yellow", "Warm Turquoise", "Turquoise", "Aqua", "Warm Aqua", "Leaf Green", "Apple Green", "Periwinkle", "Clear Warm Blue", "Warm Coral-Red", "Coral Red", "Gold", "Rose Gold"]);
const NEUTRAL = new Set(["Ivory", "Cream", "Warm Beige", "Camel", "Golden Tan", "Golden Brown", "Tan", "Nude/Beige"]);
const CAUTION = new Set(["Black", "Cool Grey", "Cool Gray", "Silver", "Burgundy", "Wine", "Navy", "Cool Pink", "Dusty Rose", "Lavender", "Lilac", "Cornflower", "Soft Rose", "Blush", "Fuchsia", "Raspberry", "Red", "Cobalt", "Powder Blue", "Grey", "Gray", "Charcoal"]);

export function paletteTier(colour: string): PaletteTier | null {
  if (BEST.has(colour)) return "best";
  if (NEUTRAL.has(colour)) return "neutral";
  if (CAUTION.has(colour)) return "caution";
  return null;
}
