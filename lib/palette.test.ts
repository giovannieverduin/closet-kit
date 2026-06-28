import { describe, it, expect } from "vitest";
import { dominantColours } from "./palette";

describe("dominantColours", () => {
  it("returns the dominant hex from a single-colour buffer", () => {
    // 4 pixels, all cobalt (47,79,160) -> bins round to (48,80,160) = #3050a0
    const px = new Uint8ClampedArray([47,79,160,255, 47,79,160,255, 47,79,160,255, 47,79,160,255]);
    expect(dominantColours(px, 1)).toEqual(["#3050a0"]);
  });
  it("returns up to k buckets, most-frequent first", () => {
    const px = new Uint8ClampedArray([
      0,0,0,255, 0,0,0,255, 0,0,0,255,   // black x3
      255,255,255,255                     // white x1
    ]);
    const out = dominantColours(px, 2);
    expect(out[0]).toBe("#000000");
    expect(out.length).toBe(2);
  });
});
