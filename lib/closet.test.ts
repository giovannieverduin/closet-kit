import { describe, it, expect } from "vitest";
import { matchesStatusMode, bulkActionTarget, ARCHIVED_STATUS } from "./closet";

describe("matchesStatusMode", () => {
  it("Closet shows only Owns", () => {
    expect(matchesStatusMode("Owns", "Closet")).toBe(true);
    expect(matchesStatusMode("Wishlist", "Closet")).toBe(false);
    expect(matchesStatusMode(ARCHIVED_STATUS, "Closet")).toBe(false);
  });
  it("Wishlist shows only Wishlist", () => {
    expect(matchesStatusMode("Wishlist", "Wishlist")).toBe(true);
    expect(matchesStatusMode("Owns", "Wishlist")).toBe(false);
  });
  it("Archived shows only Archived", () => {
    expect(matchesStatusMode(ARCHIVED_STATUS, "Archived")).toBe(true);
    expect(matchesStatusMode("Owns", "Archived")).toBe(false);
  });
  it("All shows everything in rotation but excludes Archived", () => {
    expect(matchesStatusMode("Owns", "All")).toBe(true);
    expect(matchesStatusMode("Wishlist", "All")).toBe(true);
    expect(matchesStatusMode("Inspiration", "All")).toBe(true);
    expect(matchesStatusMode(null, "All")).toBe(true);
    expect(matchesStatusMode(ARCHIVED_STATUS, "All")).toBe(false);
  });
});

describe("bulkActionTarget", () => {
  it("archives from any normal view", () => {
    expect(bulkActionTarget("Closet")).toEqual({ label: "Archive", status: ARCHIVED_STATUS });
    expect(bulkActionTarget("Wishlist")).toEqual({ label: "Archive", status: ARCHIVED_STATUS });
    expect(bulkActionTarget("All")).toEqual({ label: "Archive", status: ARCHIVED_STATUS });
  });
  it("restores to the closet from the Archived view", () => {
    expect(bulkActionTarget("Archived")).toEqual({ label: "Restore to closet", status: "Owns" });
  });
});
