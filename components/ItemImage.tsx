"use client";
import { useState } from "react";
import { placeholderGradient } from "@/lib/colours";

// Renders an item's photo, or an elegant colour+category placeholder when none
// exists OR when the image fails to load (e.g. a hot-link that gets blocked).
export function ItemImage({ photo, name, category, colours }:
  { photo: string | null; name: string; category: string | null; colours: string[] }) {
  const [errored, setErrored] = useState(false);

  if (photo && !errored) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={name}
        loading="lazy"
        decoding="async"
        onError={() => setErrored(true)}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
      />
    );
  }

  return (
    <div className="relative h-full w-full" style={{ background: placeholderGradient(colours) }}>
      <div className="absolute inset-0 bg-white/35" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] uppercase tracking-[0.25em] text-ink/55">{category || "Piece"}</span>
      </div>
    </div>
  );
}
