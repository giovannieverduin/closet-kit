"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { ItemImage } from "@/components/ItemImage";
import { ColourFilter } from "@/components/ColourFilter";
import { WardrobeColourMood } from "@/components/WardrobeColourMood";
import { CATEGORIES as VOCAB_CATEGORIES, OCCASIONS } from "@/lib/vocab";
import { paletteTier } from "@/lib/profile";
import { STATUS_MODES, StatusMode, matchesStatusMode, bulkActionTarget } from "@/lib/closet";

type Item = {
  id: string;
  name: string;
  category: string | null;
  status: string | null;
  loveLevel: string | null;
  colours: string[];
  designer: string | null;
  occasion: string[];
  notes: string;
  photo: string | null;
};

const CATEGORIES = ["All", ...VOCAB_CATEGORIES];
const MODE_LABELS: Record<StatusMode, string> = {
  Closet: "Closet",
  Wishlist: "Wishlist",
  Archived: "Archived",
  All: "All"
};

export default function Closet() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cat, setCat] = useState("All");
  const [colour, setColour] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<StatusMode>("All");
  const [fav, setFav] = useState(false);
  const [neverWorn, setNeverWorn] = useState(false);
  const [occ, setOcc] = useState("");
  const [worn, setWorn] = useState<Record<string, { event: string; date: string | null }[]>>({});

  // Multi-select / bulk archive-restore
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

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

  useEffect(() => {
    fetch("/api/looks")
      .then((r) => r.json())
      .then((d) => {
        if (d.error || !d.looks) return;
        const m: Record<string, { event: string; date: string | null }[]> = {};
        for (const l of d.looks) for (const id of l.itemIds || []) (m[id] ||= []).push({ event: l.event, date: l.date });
        setWorn(m);
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const okCat = cat === "All" || i.category === cat;
      const okColour = !colour || i.colours.includes(colour);
      const okStatus = matchesStatusMode(i.status, mode);
      const okFav = !fav || i.loveLevel === "Favorite";
      const okOcc = !occ || i.occasion.includes(occ);
      const okWorn = !neverWorn || (i.status === "Owns" && !worn[i.id]);
      const hay = `${i.name} ${i.colours.join(" ")} ${i.designer ?? ""} ${i.occasion.join(" ")}`.toLowerCase();
      const okQ = !q || hay.includes(q.toLowerCase());
      return okCat && okColour && okStatus && okFav && okOcc && okWorn && okQ;
    });
  }, [items, cat, colour, mode, fav, occ, neverWorn, worn, q]);

  // Open clean: hold the grid back until the user narrows the closet — a colour
  // selection or a submitted search are the primary entry points (other active
  // filters, including any non-default status mode, reveal it too).
  const hasQuery = colour !== null || q.trim() !== "";
  const anyFilterActive =
    hasQuery || cat !== "All" || mode !== "All" || fav || neverWorn || occ !== "";

  const action = bulkActionTarget(mode);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startSelecting() {
    setSelecting(true);
    setSelected(new Set());
  }
  function cancelSelecting() {
    setSelecting(false);
    setSelected(new Set());
  }
  function selectAll() {
    setSelected((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((i) => i.id))));
  }

  async function runBulk() {
    const ids = Array.from(selected);
    if (!ids.length || busy) return;
    setBusy(true);
    setToast("");
    const prev = items;
    // Optimistic: move the selected pieces to the target status so they drop out
    // of the current view immediately.
    setItems((cur) => cur.map((i) => (selected.has(i.id) ? { ...i, status: action.status } : i)));
    try {
      const res = await fetch("/api/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status: action.status })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Update failed");
      setToast(mode === "Archived" ? `Restored ${ids.length} to your closet` : `Archived ${ids.length}`);
      cancelSelecting();
    } catch (e: any) {
      setItems(prev); // revert
      setToast(e.message || "Could not update — try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="text-center mb-10">
        <p className="eyebrow mb-3">{items.length} pieces</p>
        <h1 className="font-display text-5xl tracking-tight">The Closet</h1>
      </div>

      <div className="flex flex-col gap-5 mb-10 border-b border-line pb-6">
        <div className="flex flex-wrap justify-center gap-x-7 gap-y-3">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`text-[11px] uppercase tracking-wide2 transition-colors ${
                cat === c ? "text-ink border-b border-ink pb-1" : "text-graphite hover:text-ink pb-1"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[11px] uppercase tracking-wide2">
          {STATUS_MODES.map((s) => (
            <button
              key={s}
              onClick={() => setMode(s)}
              className={mode === s ? "text-ink border-b border-ink pb-0.5" : "text-graphite hover:text-ink pb-0.5"}
            >
              {MODE_LABELS[s]}
            </button>
          ))}
          <button
            onClick={() => setFav((f) => !f)}
            className={fav ? "text-ink border-b border-ink pb-0.5" : "text-graphite hover:text-ink pb-0.5"}
          >
            ♥ Favourites
          </button>
          <button
            onClick={() => setNeverWorn((n) => !n)}
            className={neverWorn ? "text-ink border-b border-ink pb-0.5" : "text-graphite hover:text-ink pb-0.5"}
          >
            Never worn
          </button>
          <select
            value={occ}
            onChange={(e) => setOcc(e.target.value)}
            className="bg-transparent text-graphite uppercase tracking-wide2 text-[11px] focus:outline-none cursor-pointer"
          >
            <option value="">All occasions</option>
            {OCCASIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <button
            onClick={() => (selecting ? cancelSelecting() : startSelecting())}
            className={selecting ? "text-ink border-b border-ink pb-0.5" : "text-graphite hover:text-ink pb-0.5"}
          >
            {selecting ? "Cancel" : "Select"}
          </button>
        </div>
        <div className="mx-auto w-full max-w-sm">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="SEARCH COLOUR, DESIGNER, OCCASION"
            className="underline-input text-center text-[11px] tracking-wide2 uppercase placeholder:text-graphite"
          />
        </div>
        <WardrobeColourMood colourLists={items.map((i) => i.colours)} />
        <ColourFilter colourLists={items.map((i) => i.colours)} selected={colour} onSelect={setColour} />
      </div>

      {loading && <p className="text-center eyebrow">Loading the edit…</p>}
      {error && (
        <div className="max-w-md mx-auto text-center py-10">
          <p className="eyebrow mb-2">Closet unavailable</p>
          <p className="text-sm text-graphite">{error}. Check the Notion token and that the database is shared with the integration.</p>
        </div>
      )}

      {!loading && !error && !anyFilterActive && (
        <p className="text-center eyebrow py-16 text-graphite">
          Select a colour or search to view your closet
        </p>
      )}

      {!loading && !error && anyFilterActive && (
        <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12 ${selecting ? "pb-24" : ""}`}>
          {filtered.map((i) => {
            const isSel = selected.has(i.id);
            const inner = (
              <>
                <div className={`relative aspect-[3/4] bg-paper overflow-hidden ${isSel ? "ring-2 ring-ink" : ""}`}>
                  <ItemImage photo={i.photo} name={i.name} category={i.category} colours={i.colours} />
                  {selecting && (
                    <span
                      className={`absolute top-2 right-2 h-6 w-6 rounded-full border flex items-center justify-center text-[12px] ${
                        isSel ? "bg-ink text-paper border-ink" : "bg-paper/80 text-graphite border-line"
                      }`}
                    >
                      {isSel ? "✓" : ""}
                    </span>
                  )}
                </div>
                <div className="mt-4 text-center px-2">
                  {i.designer && i.designer !== "Other" && (
                    <p className="text-[11px] uppercase tracking-wide2 mb-1">{i.designer}</p>
                  )}
                  <p className="text-sm text-graphite leading-snug">{i.name}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-luxe text-graphite">
                    {[i.status === "Wishlist" ? "Wishlist" : i.colours[0], i.loveLevel === "Favorite" ? "♥" : null]
                      .filter(Boolean)
                      .join("  ·  ")}
                  </p>
                  {worn[i.id]?.[0] && (
                    <p className="mt-1 text-[10px] text-graphite italic">worn · {worn[i.id][0].event || "logged"}</p>
                  )}
                  {i.status === "Wishlist" && i.colours.some((c) => paletteTier(c) === "caution") && (
                    <p className="mt-1 text-[10px] uppercase tracking-luxe text-graphite italic">off your palette</p>
                  )}
                </div>
              </>
            );
            return selecting ? (
              <button
                key={i.id}
                type="button"
                onClick={() => toggleSelected(i.id)}
                className="group block text-left"
                aria-pressed={isSel}
              >
                {inner}
              </button>
            ) : (
              <Link key={i.id} href={`/item/${i.id}`} className="group block">
                {inner}
              </Link>
            );
          })}
          {filtered.length === 0 && <p className="col-span-full text-center eyebrow">No pieces match.</p>}
        </div>
      )}

      {selecting && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <span className="text-[11px] uppercase tracking-wide2 text-graphite">{selected.size} selected</span>
            <div className="flex items-center gap-5">
              <button
                onClick={selectAll}
                disabled={!filtered.length}
                className="text-[11px] uppercase tracking-wide2 text-graphite hover:text-ink disabled:opacity-40"
              >
                {selected.size === filtered.length && filtered.length > 0 ? "Clear all" : "Select all"}
              </button>
              <button
                onClick={runBulk}
                disabled={!selected.size || busy}
                className="btn-solid text-[11px] uppercase tracking-wide2 disabled:opacity-40"
              >
                {busy ? "Saving…" : action.label}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
          <p className="rounded-full bg-ink text-paper text-[11px] uppercase tracking-wide2 px-5 py-2">{toast}</p>
        </div>
      )}
    </Shell>
  );
}
