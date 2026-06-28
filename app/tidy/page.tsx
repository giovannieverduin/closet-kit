"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";

type Item = {
  id: string;
  name: string;
  category: string | null;
  colours: string[];
  designer: string | null;
  photo: string | null;
};

type Candidate = { image: string | null; title: string | null; price: string | null; sourceUrl: string };
type Row = { finding: boolean; applying: boolean; applied: boolean; candidate: Candidate | null; error: string };

const blank: Row = { finding: false, applying: false, applied: false, candidate: null, error: "" };

export default function Tidy() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [runningAll, setRunningAll] = useState(false);

  useEffect(() => {
    fetch("/api/wardrobe")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setItems(d.items);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const patch = (id: string, p: Partial<Row>) => setRows((r) => ({ ...r, [id]: { ...blank, ...r[id], ...p } }));

  // Find a clean stock product image for one item, from its brand/name/colour/category.
  async function findFor(it: Item): Promise<Candidate | null> {
    patch(it.id, { finding: true, error: "", candidate: null });
    try {
      const res = await fetch("/api/find-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: it.designer || undefined, name: it.name, colours: it.colours, category: it.category })
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.image) {
        const cand: Candidate = { image: d.image, title: d.title, price: d.price, sourceUrl: d.sourceUrl };
        patch(it.id, { finding: false, candidate: cand });
        return cand;
      }
      patch(it.id, { finding: false, error: d.error || "No clean image found." });
      return null;
    } catch {
      patch(it.id, { finding: false, error: "Search failed — try again." });
      return null;
    }
  }

  // Apply a found image to the item (replaces the current photo with the clean stock shot).
  async function apply(it: Item, image: string) {
    patch(it.id, { applying: true, error: "" });
    try {
      const res = await fetch(`/api/items/${it.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo: image })
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        patch(it.id, { applying: false, error: d.error || "Couldn't apply." });
        return;
      }
      setItems((arr) => arr.map((x) => (x.id === it.id ? { ...x, photo: image } : x)));
      patch(it.id, { applying: false, applied: true, candidate: null });
    } catch {
      patch(it.id, { applying: false, error: "Couldn't apply." });
    }
  }

  // Sequentially find candidates for every item without one yet (gentle on cost/rate limits).
  async function findAll() {
    setRunningAll(true);
    for (const it of items) {
      const r = rows[it.id];
      if (r?.candidate || r?.applied) continue;
      await findFor(it);
    }
    setRunningAll(false);
  }

  return (
    <Shell>
      <div className="text-center mb-10">
        <p className="eyebrow mb-3">Closet care</p>
        <h1 className="font-display text-5xl tracking-tight">Tidy the closet</h1>
        <p className="mt-4 text-sm text-graphite max-w-md mx-auto leading-relaxed">
          Find the original stock photo for each piece, so every item looks clean, upright and
          well-framed. Review each match, then apply it to replace the current photo.
        </p>
        <div className="mt-5">
          <button onClick={findAll} disabled={runningAll || loading || !items.length} className="btn-solid">
            {runningAll ? "Finding clean images…" : "Find clean images for all"}
          </button>
        </div>
      </div>

      {loading && <p className="text-center eyebrow">Loading the closet…</p>}
      {error && (
        <div className="max-w-md mx-auto text-center py-10">
          <p className="eyebrow mb-2">Closet unavailable</p>
          <p className="text-sm text-graphite">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-8">
          {items.map((it) => {
            const r = rows[it.id] || blank;
            return (
              <div key={it.id} className="grid grid-cols-[88px_1fr] sm:grid-cols-[120px_1fr] gap-5 items-start border-t border-line pt-6">
                {/* Current photo */}
                <Link href={`/item/${it.id}`} className="block aspect-[3/4] bg-paper overflow-hidden border border-line">
                  {it.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.photo} alt={it.name} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center eyebrow text-graphite">No photo</span>
                  )}
                </Link>

                <div className="min-w-0">
                  <p className="text-sm text-ink leading-snug">{it.name}</p>
                  <p className="eyebrow mt-1 text-graphite">
                    {[it.designer && it.designer !== "Other" ? it.designer : null, it.category, it.colours[0]].filter(Boolean).join("  ·  ")}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                    <button
                      onClick={() => findFor(it)}
                      disabled={r.finding}
                      className="text-[11px] uppercase tracking-wide2 text-graphite hover:text-ink disabled:opacity-40"
                    >
                      {r.finding ? "Finding…" : r.candidate ? "Search again" : "Find clean image"}
                    </button>
                    {r.applied && <span className="text-[11px] uppercase tracking-wide2 text-ink">✓ Applied</span>}
                  </div>

                  {r.error && <p className="text-sale text-[11px] uppercase tracking-wide2 mt-2">{r.error}</p>}

                  {r.candidate?.image && (
                    <div className="mt-4 flex items-center gap-4 border border-line p-3 max-w-md">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.candidate.image} alt={r.candidate.title || "match"} className="w-16 h-20 object-cover bg-paper border border-line shrink-0" />
                      <div className="min-w-0">
                        {r.candidate.title && <p className="text-xs truncate">{r.candidate.title}</p>}
                        {r.candidate.price && <p className="eyebrow mt-1">{r.candidate.price}</p>}
                        {r.candidate.sourceUrl && (
                          <a href={r.candidate.sourceUrl} target="_blank" rel="noopener noreferrer" className="eyebrow text-graphite hover:text-ink">source ↗</a>
                        )}
                        <div className="mt-2 flex gap-4">
                          <button
                            onClick={() => apply(it, r.candidate!.image!)}
                            disabled={r.applying}
                            className="text-[11px] uppercase tracking-wide2 text-ink hover:text-graphite disabled:opacity-40"
                          >
                            {r.applying ? "Applying…" : "Apply this image"}
                          </button>
                          <button onClick={() => patch(it.id, { candidate: null })} className="text-[11px] uppercase tracking-wide2 text-graphite hover:text-ink">
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {items.length === 0 && <p className="col-span-full text-center eyebrow">Closet is empty.</p>}
        </div>
      )}
    </Shell>
  );
}
