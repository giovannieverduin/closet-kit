"use client";
import { hexFor, colourCounts } from "@/lib/colours";
import { paletteTier } from "@/lib/profile";

// A row of swatches for every colour present in the closet; tap to filter, tap again to clear.
// Colours in her palette get a subtle ring; off-palette (caution) colours are dimmed.
export function ColourFilter({ colourLists, selected, onSelect }:
  { colourLists: string[][]; selected: string | null; onSelect: (c: string | null) => void }) {
  const counts = colourCounts(colourLists);
  if (!counts.length) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      {counts.map(({ name }) => {
        const active = selected === name;
        const tier = paletteTier(name);
        return (
          <button
            key={name}
            onClick={() => onSelect(active ? null : name)}
            title={tier === "best" ? `${name} — in your palette` : tier === "caution" ? `${name} — off your palette` : name}
            aria-label={name}
            className={`h-5 w-5 rounded-full border transition-transform ${
              active ? "scale-125 border-ink ring-1 ring-ink/20"
                : tier === "best" ? "border-line hover:scale-110 ring-2 ring-offset-1 ring-ink/25"
                : tier === "caution" ? "border-line hover:scale-110 opacity-50"
                : "border-line hover:scale-110"
            }`}
            style={{ background: hexFor(name) }}
          />
        );
      })}
    </div>
  );
}
