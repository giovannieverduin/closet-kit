"use client";

import { useEffect, useState } from "react";

type Look = { id: string; occasion: string; wornWith: string; date: string | null };

// Shows "Looks featuring this piece" for a wardrobe item, from the outfit diary.
export function WornBefore({ itemId }: { itemId: string }) {
  const [looks, setLooks] = useState<Look[]>([]);

  useEffect(() => {
    fetch(`/api/looks/by-item?itemId=${encodeURIComponent(itemId)}`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setLooks(d.looks || []); })
      .catch(() => {});
  }, [itemId]);

  if (!looks.length) return null;

  return (
    <div className="mt-3">
      <p className="eyebrow mb-1">Looks featuring this piece</p>
      {looks.slice(0, 3).map((l) => (
        <p key={l.id} className="text-[11px] text-graphite leading-snug">
          Worn {l.occasion ? <>at <span className="text-ink">{l.occasion}</span></> : "before"}
          {l.wornWith && ` · with ${l.wornWith}`}
          {l.date && ` · ${new Date(l.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`}
        </p>
      ))}
    </div>
  );
}
