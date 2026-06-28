"use client";
import { hexFor, colourCounts } from "@/lib/colours";

// A thin gradient bar showing the wardrobe's colour makeup (top colours, weighted).
export function WardrobeColourMood({ colourLists }: { colourLists: string[][] }) {
  const counts = colourCounts(colourLists);
  if (!counts.length) return null;
  const top = counts.slice(0, 8);
  const topTotal = top.reduce((s, c) => s + c.count, 0);
  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="flex h-1.5 overflow-hidden rounded-full">
        {top.map((c) => (
          <div
            key={c.name}
            title={`${c.name} · ${c.count}`}
            style={{ width: `${(c.count / topTotal) * 100}%`, background: hexFor(c.name) }}
          />
        ))}
      </div>
    </div>
  );
}
