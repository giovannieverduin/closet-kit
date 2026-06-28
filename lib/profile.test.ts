import { describe, it, expect } from "vitest";
import { ANALYSIS, COLOR_GROUPS, METALS, PATTERNS, paletteTier } from "./profile";

describe("warm spring palette data", () => {
  it("is set to Warm Spring", () => {
    expect(ANALYSIS.season).toBe("Warm Spring");
    expect(ANALYSIS.axes.length).toBe(4);
    expect(ANALYSIS.features.length).toBeGreaterThan(0);
  });

  it("has flatter / neutral / avoid colour groups, each with valid swatches", () => {
    const keys = COLOR_GROUPS.map((g) => g.key);
    expect(keys).toContain("flatter");
    expect(keys).toContain("neutrals");
    expect(COLOR_GROUPS.some((g) => g.tone === "avoid")).toBe(true);
    for (const g of COLOR_GROUPS) {
      expect(g.swatches.length).toBeGreaterThan(0);
      for (const s of g.swatches) {
        expect(s.name).toBeTruthy();
        expect(s.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    }
  });

  it("has warm metals and pattern guidance", () => {
    expect(METALS.map((m) => m.name)).toContain("Gold");
    expect(METALS.map((m) => m.name)).not.toContain("Silver");
    expect(PATTERNS.length).toBeGreaterThan(0);
  });
});

describe("paletteTier (warm spring)", () => {
  it("rates warm colours as best", () => {
    expect(paletteTier("Coral")).toBe("best");
    expect(paletteTier("Gold")).toBe("best");
  });
  it("rates warm earth tones as neutral", () => {
    expect(paletteTier("Camel")).toBe("neutral");
  });
  it("flags cool / dark colours as caution", () => {
    expect(paletteTier("Black")).toBe("caution");
    expect(paletteTier("Cobalt")).toBe("caution");
    expect(paletteTier("Silver")).toBe("caution");
  });
  it("returns null for unknown colours", () => {
    expect(paletteTier("Chartreuse")).toBeNull();
  });
});
