import { describe, it, expect } from "vitest";
import { lookTitle } from "./looks";

describe("lookTitle", () => {
  it("uses the first tag after the date", () => {
    expect(lookTitle({ date: "2026-06-22", tags: ["date night", "winner"] })).toBe("2026-06-22 - date night");
  });

  it("falls back to occasion when there are no tags", () => {
    expect(lookTitle({ date: "2026-06-22", occasion: "Sara's wedding" })).toBe("2026-06-22 - Sara's wedding");
  });

  it("prefers a tag over the occasion", () => {
    expect(lookTitle({ date: "2026-06-22", tags: ["resort"], occasion: "Mykonos" })).toBe("2026-06-22 - resort");
  });

  it("handles a date with no label", () => {
    expect(lookTitle({ date: "2026-06-22" })).toBe("2026-06-22");
  });

  it("handles a label with no date", () => {
    expect(lookTitle({ tags: ["work"] })).toBe("work");
  });

  it("returns 'Look' when nothing is provided", () => {
    expect(lookTitle({})).toBe("Look");
  });
});
