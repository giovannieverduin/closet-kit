import { describe, it, expect } from "vitest";
import { pairScore, suggestPairings, type PairItem } from "./pairing";

const mk = (id: string, category: string, colours: string[], occasion: string[]): PairItem =>
  ({ id, name: id, category, colours, occasion, status: "Owns" });

describe("pairing", () => {
  it("scores shared occasion higher than colour alone", () => {
    const dress = mk("d", "Dress", ["Cobalt"], ["Evening"]);
    const sameOcc = mk("s", "Shoes", ["Gold"], ["Evening"]);
    const diffOcc = mk("b", "Bag", ["Gold"], ["Work"]);
    expect(pairScore(dress, sameOcc)).toBeGreaterThan(pairScore(dress, diffOcc));
  });

  it("suggestPairings excludes the hero and same-category items, ranked", () => {
    const hero = mk("hero", "Dress", ["Cobalt"], ["Evening"]);
    const items = [
      hero,
      mk("otherDress", "Dress", ["Cobalt"], ["Evening"]), // same category -> excluded
      mk("shoe", "Shoes", ["Gold"], ["Evening"]),
      mk("bag", "Bag", ["Silver"], ["Evening"]),
      mk("work", "Bag", ["Black"], ["Work"])
    ];
    const out = suggestPairings(hero, items, 3);
    expect(out.find((i) => i.id === "hero")).toBeUndefined();
    expect(out.find((i) => i.id === "otherDress")).toBeUndefined();
    expect(out[0].id === "shoe" || out[0].id === "bag").toBe(true);
  });
});
