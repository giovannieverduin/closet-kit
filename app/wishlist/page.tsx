"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { TryOn } from "@/components/TryOn";

type StylingPiece = { brand: string; name: string; price: string; link: string };
type Item = {
  id: string;
  brand: string;
  name: string;
  price: string;
  link: string | null;
  category: string;
  archetype: string;
  onBody: string | null;
  productImage: string | null;
  styling: StylingPiece[];
  note: string;
  priority: string | null;
};

export default function Wishlist() {
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<"all" | "Really want">("all");
  const [retryId, setRetryId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  function load() {
    fetch("/api/wishlist")
      .then((r) => r.json())
      .then((d) => { if (!d.error) setItems(d.items); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }
  useEffect(load, []);

  const shown = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.priority === "Really want")),
    [items, filter]
  );

  function patch(id: string, body: { note?: string; priority?: string }) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...body } : i)));
    fetch(`/api/wishlist/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).catch(() => {});
  }

  async function remove(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/wishlist/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function markBought(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/wishlist/${id}/buy`, { method: "POST" });
    setBusyId(null);
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      setToast("Moved to your closet.");
      setTimeout(() => setToast(""), 2500);
    }
  }

  return (
    <Shell>
      <div className="text-center mb-10">
        <p className="eyebrow mb-3">Saved on you</p>
        <h1 className="font-display text-5xl tracking-tight">Wishlist</h1>
        <p className="mt-4 text-sm text-graphite max-w-md mx-auto leading-relaxed">
          Pieces you&apos;ve tried on and loved — with the link, the price and how to style them.
        </p>
      </div>

      {toast && <p className="eyebrow text-center mb-6">{toast}</p>}

      {items.length > 0 && (
        <div className="flex justify-center gap-6 mb-10 border-b border-line pb-5">
          {(["all", "Really want"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[11px] uppercase tracking-wide2 pb-1 transition-colors ${
                filter === f ? "text-ink border-b border-ink" : "text-graphite hover:text-ink"
              }`}
            >
              {f === "all" ? "All" : "Really want"}
            </button>
          ))}
        </div>
      )}

      {loaded && items.length === 0 && (
        <div className="max-w-sm mx-auto text-center border-t border-line pt-12">
          <p className="font-display text-3xl tracking-tight">Nothing saved yet</p>
          <p className="mt-4 text-sm text-graphite leading-relaxed">
            This is where your try-ons land. Open Discover, see a piece on you, then tap
            “Save to wishlist” to keep it here with its link, its price and how to style it.
          </p>
          <Link href="/discover" className="btn-solid inline-block mt-7">
            Save a Discover try-on
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-14">
        {shown.map((i) => (
          <article key={i.id} className="border-t border-line pt-8">
            <div className="grid grid-cols-[140px_1fr] gap-5">
              <div className="aspect-[3/4] bg-paper overflow-hidden border border-line">
                {i.onBody ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/wishlist/photo?id=${i.id}`} alt={i.name} loading="lazy" className="h-full w-full object-cover" />
                ) : i.productImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.productImage} alt={i.name} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center"><span className="eyebrow">Saved</span></div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {i.archetype && <p className="eyebrow mb-1">{i.archetype}</p>}
                    <h2 className="font-display text-2xl leading-tight">{i.brand}</h2>
                    <p className="text-sm text-graphite leading-snug">{i.name}</p>
                  </div>
                  <button
                    onClick={() => patch(i.id, { priority: i.priority === "Really want" ? "Maybe" : "Really want" })}
                    className={`shrink-0 text-base leading-none mt-1 ${i.priority === "Really want" ? "text-ink" : "text-line hover:text-graphite"}`}
                    title={i.priority === "Really want" ? "Really want" : "Mark as really want"}
                    aria-label="toggle priority"
                  >
                    ♥
                  </button>
                </div>

                {i.link && (
                  <a href={i.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-baseline gap-2 mt-3 text-sm text-ink hover:text-graphite">
                    Shop ↗ {i.price && <span className="text-graphite">{i.price}</span>}
                  </a>
                )}

                {i.styling.length > 0 && (
                  <div className="mt-4">
                    <p className="eyebrow mb-2">Style it with</p>
                    {i.styling.map((s, idx) => (
                      <a key={idx} href={s.link} target="_blank" rel="noopener noreferrer" className="block text-[12px] text-graphite hover:text-ink leading-snug">
                        {s.brand ? `${s.brand} — ` : ""}{s.name} ↗ {s.price && <span>· {s.price}</span>}
                      </a>
                    ))}
                  </div>
                )}

                <input
                  defaultValue={i.note}
                  onBlur={(e) => { if (e.target.value !== i.note) patch(i.id, { note: e.target.value }); }}
                  placeholder="ADD A NOTE"
                  className="underline-input text-[11px] tracking-wide2 uppercase placeholder:text-graphite mt-4 w-full"
                />

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-5">
                  <button onClick={() => markBought(i.id)} disabled={busyId === i.id} className="text-[11px] uppercase tracking-wide2 text-ink hover:text-graphite">
                    Bought it
                  </button>
                  <button onClick={() => setRetryId(retryId === i.id ? null : i.id)} className="text-[11px] uppercase tracking-wide2 text-graphite hover:text-ink">
                    {retryId === i.id ? "Hide try-on" : "Re-try-on"}
                  </button>
                  <button onClick={() => remove(i.id)} disabled={busyId === i.id} className="text-[11px] uppercase tracking-wide2 text-graphite hover:text-sale">
                    Remove
                  </button>
                </div>

                {retryId === i.id && (
                  <div className="mt-4">
                    <TryOn garmentUrl={i.productImage} category={i.category || null} />
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </Shell>
  );
}
