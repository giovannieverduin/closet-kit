import { describe, it, expect } from "vitest";
import { COLOUR_HEX, hexFor, harmony, placeholderGradient, colourCounts } from "./colours";

describe("colours", () => {
  it("maps every known wardrobe colour to a 6-digit hex", () => {
    for (const name of Object.keys(COLOUR_HEX)) {
      expect(COLOUR_HEX[name]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
  it("hexFor is case-insensitive and falls back to a neutral", () => {
    expect(hexFor("cobalt")).toBe(COLOUR_HEX["Cobalt"]);
    expect(hexFor("not-a-colour")).toBe("#c9c4bc");
  });
  it("harmony returns 1 for identical colours and 0..1 otherwise", () => {
    expect(harmony("#2f4fa0", "#2f4fa0")).toBe(1);
    const h = harmony("#2f4fa0", "#d9a7c7");
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(1);
  });
  it("placeholderGradient uses mapped hexes and falls back when empty", () => {
    expect(placeholderGradient(["Cobalt"])).toContain(COLOUR_HEX["Cobalt"]);
    expect(placeholderGradient(["Cobalt", "Soft Rose"])).toContain(COLOUR_HEX["Soft Rose"]);
    expect(placeholderGradient([])).toContain(COLOUR_HEX["Nude/Beige"]);
  });
  it("colourCounts tallies usage and sorts most-used first", () => {
    const out = colourCounts([["Cobalt", "Gold"], ["Cobalt"], ["Soft Rose"]]);
    expect(out[0]).toEqual({ name: "Cobalt", count: 2 });
    expect(out.length).toBe(3);
    expect(colourCounts([])).toEqual([]);
  });
});
