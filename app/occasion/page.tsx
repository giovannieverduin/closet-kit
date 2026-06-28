"use client";

import { useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { ItemImage } from "@/components/ItemImage";

type Item = { id: string; name: string; category: string | null; colours: string[]; designer: string | null; photo: string | null };
type Look = { title: string; itemIds: string[]; why: string };

const PRESETS = ["Wedding guest", "Work", "Dinner", "Resort / Boat", "Casual"];

export default function Occasion() {
  const [occasion, setOccasion] = useState("");
  const [looks, setLooks] = useState<Look[] | null>(null);
  const [gaps, setGaps] = useState<string[]>([]);
  const [byId, setById] = useState<Record<string, Item>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go(text: string) {
    const occ = text.trim();
    if (!occ || busy) return;
    setOccasion(occ);
    setBusy(true);
    setError("");
    setLooks(null);
    setGaps([]);
    try {
      const res = await fetch("/api/occasion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occasion: occ })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "Couldn't assemble looks");
      } else {
        const m: Record<string, Item> = {};
        (d.items || []).forEach((i: Item) => { m[i.id] = i; });
        setById(m);
        setLooks(d.looks || []);
        setGaps(d.gaps || []);
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="text-center mb-10">
        <p className="eyebrow mb-3">From what you own</p>
        <h1 className="font-display text-5xl tracking-tight">What can you wear?</h1>
        <p className="mt-4 text-sm text-graphite max-w-md mx-auto leading-relaxed">
          Tell me the occasion and I&rsquo;ll pull complete looks from your own closet — then flag anything you&rsquo;re missing.
        </p>
      </div>

      <div className="max-w-md mx-auto">
        <input
          value={occasion}
          onChange={(e) => setOccasion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go(occasion)}
          placeholder="E.G. LAKE COMO CHURCH WEDDING, 4PM"
          className="underline-input text-center text-[11px] tracking-wide2 uppercase placeholder:text-graphite"
        />
        <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2">
          {PRESETS.map((p) => (
            <button key={p} onClick={() => go(p)} className="eyebrow hover:text-ink">{p}</button>
          ))}
        </div>
        <div className="text-center mt-6">
          <button onClick={() => go(occasion)} disabled={busy || !occasion.trim()} className="btn-solid">
            {busy ? "Pulling looks together…" : "Style you"}
          </button>
        </div>
        {error && <p className="text-sale text-xs mt-4 text-center uppercase tracking-wide2">{error}</p>}
      </div>

      {looks && looks.length > 0 && (
        <div className="mt-14 space-y-14">
          {looks.map((look, idx) => (
            <div key={idx}>
              <div className="text-center mb-6">
                <p className="eyebrow mb-1">Look {idx + 1}</p>
                <h2 className="font-display text-2xl tracking-tight">{look.title}</h2>
                {look.why && <p className="mt-2 text-sm text-graphite max-w-lg mx-auto leading-relaxed">{look.why}</p>}
              </div>
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-8">
                {look.itemIds.map((id) => {
                  const it = byId[id];
                  if (!it) return null;
                  return (
                    <Link key={id} href={`/item/${id}`} className="group block w-32">
                      <div className="aspect-[3/4] bg-paper overflow-hidden">
                        <ItemImage photo={it.photo} name={it.name} category={it.category} colours={it.colours} />
                      </div>
                      <p className="mt-2 text-center text-[11px] text-graphite leading-snug">{it.name}</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {looks && looks.length === 0 && !error && (
        <p className="text-center eyebrow mt-12">I couldn&rsquo;t build a full look for that from what you own yet — see the gaps below.</p>
      )}

      {gaps.length > 0 && (
        <div className="mt-16 max-w-md mx-auto border-t border-line pt-8 text-center">
          <p className="eyebrow mb-4">Worth adding</p>
          <ul className="space-y-2">
            {gaps.map((g, i) => <li key={i} className="text-sm text-graphite">{g}</li>)}
          </ul>
        </div>
      )}
    </Shell>
  );
}
