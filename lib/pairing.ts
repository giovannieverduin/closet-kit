import { hexFor, harmony } from "./colours";

export type PairItem = {
  id: string;
  name: string;
  category: string | null;
  colours: string[];
  occasion: string[];
  status: string | null;
};

// How well two pieces pair: shared occasions weigh heaviest, then best colour harmony.
export function pairScore(a: PairItem, b: PairItem): number {
  const sharedOcc = a.occasion.filter((o) => b.occasion.includes(o)).length;
  let bestHarmony = 0;
  for (const ca of a.colours) {
    for (const cb of b.colours) {
      bestHarmony = Math.max(bestHarmony, harmony(hexFor(ca), hexFor(cb)));
    }
  }
  return sharedOcc * 0.6 + bestHarmony;
}

// The best other pieces to wear with a hero piece (different category, owned-first).
export function suggestPairings(hero: PairItem, items: PairItem[], n = 3): PairItem[] {
  return items
    .filter((i) => i.id !== hero.id && i.category !== hero.category)
    .map((i) => ({ i, s: pairScore(hero, i) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => x.i);
}
