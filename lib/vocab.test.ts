import { describe, it, expect } from "vitest";
import { tryOnCategory } from "./vocab";

describe("tryOnCategory", () => {
  it("maps garments to FASHN classes", () => {
    expect(tryOnCategory("Dress")).toBe("one-pieces");
    expect(tryOnCategory("Outfit")).toBe("one-pieces");
    expect(tryOnCategory("Top")).toBe("tops");
    expect(tryOnCategory("Outerwear")).toBe("tops");
    expect(tryOnCategory("Bottom")).toBe("bottoms");
  });
  it("returns null for non-garments", () => {
    for (const c of ["Bag", "Shoes", "Jewelry", "Accessory", null, "Unknown"]) {
      expect(tryOnCategory(c)).toBeNull();
    }
  });
});
