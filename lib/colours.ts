// Maps the wardrobe DB's Colour multi-select option names to real hex values.
export const COLOUR_HEX: Record<string, string> = {
  // Warm — Warm Spring bests
  "Coral": "#FB7A5B", "Coral Red": "#EB5A40", "Peach": "#F6A877", "Apricot": "#F5B879",
  "Salmon": "#F98E78", "Mango": "#F4A130", "Golden Yellow": "#F2B33C", "Butter Yellow": "#F4E3A1",
  "Warm Turquoise": "#28B6AE", "Aqua": "#4FC2BD", "Leaf Green": "#80B24C", "Apple Green": "#9CC74F",
  "Periwinkle": "#6E8FE0", "Clear Warm Blue": "#3F9BD8",
  // Warm neutrals & metals
  "Ivory": "#F4EEDD", "Warm Beige": "#DDC6A3", "Camel": "#C49A63", "Golden Tan": "#C9A152",
  "Golden Brown": "#7A5234", "Tan": "#A6743F", "Gold": "#D4A92A", "Rose Gold": "#E3A88F",
  // Cooler / legacy
  "Powder Blue": "#a9c7e8", "Cornflower": "#7d9be0", "Cobalt": "#2f4fa0",
  "Navy": "#23315e", "Lavender": "#c3b4e6", "Lilac": "#caa9d8",
  "Soft Rose": "#e3b7c9", "Blush": "#f0cdd6", "Fuchsia": "#c64591",
  "Raspberry": "#b13160", "Red": "#c0392b", "Burgundy": "#6E2433",
  "Charcoal": "#3A3F47", "Cool Grey": "#A7ADB5",
  "White": "#f5f3ee", "Cream": "#efe6d2", "Black": "#1c1a17", "Nude/Beige": "#d8c6ac",
  "Green": "#5b7a52", "Silver": "#c7ccd1", "Metallic": "#b9b2a6", "Multicolour": "#9a8fb0"
};

const NEUTRAL = "#c9c4bc";

export function hexFor(name: string): string {
  const found = Object.keys(COLOUR_HEX).find((k) => k.toLowerCase() === name.toLowerCase());
  return found ? COLOUR_HEX[found] : NEUTRAL;
}

function toHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0; const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return [h, s, l];
}

// Tally colour usage across items' colour lists, most-used first.
export function colourCounts(lists: string[][]): Array<{ name: string; count: number }> {
  const m = new Map<string, number>();
  for (const list of lists) for (const c of list) m.set(c, (m.get(c) ?? 0) + 1);
  return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

// A soft two-stop gradient from an item's tagged colours, for image placeholders.
export function placeholderGradient(colours: string[]): string {
  const hexes = (colours.length ? colours : ["Nude/Beige"]).slice(0, 2).map(hexFor);
  const a = hexes[0];
  const b = hexes[1] ?? hexes[0];
  return `linear-gradient(145deg, ${a}, ${b})`;
}

// 0..1 harmony: closeness in hue with a bonus for analogous/complementary relationships.
export function harmony(a: string, b: string): number {
  if (a.toLowerCase() === b.toLowerCase()) return 1;
  const [ha] = toHsl(a), [hb] = toHsl(b);
  let diff = Math.abs(ha - hb); if (diff > 180) diff = 360 - diff;
  const analogous = 1 - diff / 180;            // close hues score high
  const complementary = 1 - Math.abs(diff - 180) / 180; // opposite hues also pleasant
  return Math.max(analogous, complementary * 0.85);
}
