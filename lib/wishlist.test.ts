import { describe, it, expect } from "vitest";
import { wishlistTitle, stylingToJson, jsonToStyling } from "./wishlist";

describe("wishlistTitle", () => {
  it("joins brand and name with an em dash", () => {
    expect(wishlistTitle({ brand: "Cortana", name: "Mona wrap dress" })).toBe("Cortana — Mona wrap dress");
  });
  it("falls back to just the name", () => {
    expect(wishlistTitle({ name: "Mona wrap dress" })).toBe("Mona wrap dress");
  });
  it("falls back to just the brand", () => {
    expect(wishlistTitle({ brand: "Cortana" })).toBe("Cortana");
  });
  it("has a sane default", () => {
    expect(wishlistTitle({})).toBe("Wishlist item");
  });
});

describe("styling JSON round-trip", () => {
  const pieces = [
    { brand: "Chloé", name: "Lauren ballet flats", price: "$400", link: "https://x/1" },
    { brand: "DeMellier", name: "NY Midi tote", price: "$595", link: "https://x/2" }
  ];

  it("serialises and parses back to the same data", () => {
    expect(jsonToStyling(stylingToJson(pieces))).toEqual(pieces);
  });
  it("empty list serialises to empty string", () => {
    expect(stylingToJson([])).toBe("");
    expect(jsonToStyling("")).toEqual([]);
  });
  it("bad JSON parses to empty list", () => {
    expect(jsonToStyling("not json")).toEqual([]);
  });
  it("coerces missing fields to empty strings", () => {
    expect(jsonToStyling(JSON.stringify([{ name: "x" }]))).toEqual([{ brand: "", name: "x", price: "", link: "" }]);
  });
});
