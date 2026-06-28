"use client";

import { useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import { ItemImage } from "@/components/ItemImage";
import { WearLog } from "@/components/WearLog";
import { suggestPairings, type PairItem } from "@/lib/pairing";

type Item = PairItem & { photo: string | null; designer: string | null };
type Look = { title: string; pieces: string[]; rationale: string };

export default function Looks() {
  const [items, setItems] = useState<Item[]>([]);
  const [mode, setMode] = useState<"suggest" | "diary">("suggest");
  const [heroId, setHeroId] = useState<string | null>(null);
  const [occasion, setOccasion] = useState("");
  const [look, setLook] = useState<Look | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    fetch("/api/wardrobe")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setItems(d.items);
      })
      .catch(() => {});
  }, []);

  const owned = useMemo(() => items.filter((i) => i.status === "Owns"), [items]);
  const hero = owned.find((i) => i.id === heroId) || null;
  const pairs = useMemo(() => (hero ? suggestPairings(hero, owned, 3) : []), [hero, owned]);

  function idsForNames(names: string[]): string[] {
    return names
      .map((n) =>
        owned.find((i) => i.name === n) ||
        owned.find((i) => i.name.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(i.name.toLowerCase()))
      )
      .filter(Boolean)
      .map((i) => (i as Item).id);
  }

  async function saveLook(occasion: string, itemIds: string[], notes?: string) {
    setSavedMsg("");
    const res = await fetch("/api/looks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        occasion,
        pieceIds: itemIds,
        notes,
        date: new Date().toISOString().slice(0, 10)
      })
    });
    setSavedMsg(res.ok ? "Saved to your looks." : "Couldn't save the look.");
  }

  async function styleMe() {
    setBusy(true);
    setError("");
    setLook(null);
    const res = await fetch("/api/look", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ occasion })
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) setLook(data.look);
    else setError(data.error || "Couldn't style a look");
  }

  return (
    <Shell>
      <div className="text-center mb-8">
        <p className="eyebrow mb-3">Styling</p>
        <h1 className="font-display text-5xl tracking-tight">Looks</h1>
      </div>

      <div className="flex justify-center gap-8 mb-10 border-b border-line pb-5">
        {(["suggest", "diary"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`text-[11px] uppercase tracking-wide2 transition-colors ${
              mode === m ? "text-ink border-b border-ink pb-1" : "text-graphite hover:text-ink pb-1"
            }`}
          >
            {m === "suggest" ? "Suggest" : "Diary"}
          </button>
        ))}
      </div>

      {mode === "suggest" && (
        <div className="space-y-12">
          {/* AI "Style me" */}
          <div className="max-w-md mx-auto text-center">
            <input
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              placeholder="OCCASION — E.G. GARDEN WEDDING (OPTIONAL)"
              className="underline-input text-center text-[11px] tracking-wide2 uppercase placeholder:text-graphite"
            />
            <button onClick={styleMe} disabled={busy} className="btn-solid mt-5">
              {busy ? "Styling…" : "Style you"}
            </button>
            {error && <p className="text-sale text-xs mt-4 uppercase tracking-wide2">{error}</p>}
            {look && (
              <div className="mt-7 text-left border-t border-line pt-6">
                <p className="font-display text-3xl mb-3">{look.title}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {look.pieces.map((p) => (
                    <span key={p} className="rounded-full border border-line px-3 py-1 text-[11px] text-ink">{p}</span>
                  ))}
                </div>
                <p className="text-sm text-graphite leading-relaxed">{look.rationale}</p>
                <button
                  onClick={() => saveLook(look.title, idsForNames(look.pieces), look.rationale)}
                  className="mt-5 border border-ink text-ink text-[11px] uppercase tracking-wide2 px-5 py-2 hover:bg-ink hover:text-paper transition-colors"
                >
                  Save this look
                </button>
                {savedMsg && <p className="eyebrow mt-3">{savedMsg}</p>}
              </div>
            )}
          </div>

          {/* Rule-based pairing canvas */}
          <div>
            <p className="eyebrow text-center mb-5">Or pick a piece to pair</p>
            <div className="flex gap-3 overflow-x-auto pb-3 -mx-6 px-6">
              {owned.map((i) => (
                <button
                  key={i.id}
                  onClick={() => setHeroId(i.id)}
                  className={`shrink-0 w-16 aspect-[3/4] overflow-hidden border transition-all ${
                    heroId === i.id ? "border-ink ring-1 ring-ink/20" : "border-line opacity-70 hover:opacity-100"
                  }`}
                  title={i.name}
                >
                  <ItemImage photo={i.photo} name={i.name} category={i.category} colours={i.colours} />
                </button>
              ))}
            </div>

            {hero && (
              <div className="mt-8 grid grid-cols-[1fr_auto_2fr] items-center gap-4 max-w-2xl mx-auto">
                <div>
                  <div className="aspect-[3/4] overflow-hidden border border-ink">
                    <ItemImage photo={hero.photo} name={hero.name} category={hero.category} colours={hero.colours} />
                  </div>
                  <p className="text-[11px] text-center mt-2 text-graphite leading-snug">{hero.name}</p>
                </div>
                <div className="text-graphite text-2xl font-display">+</div>
                <div className="grid grid-cols-3 gap-3">
                  {pairs.map((p) => (
                    <div key={p.id}>
                      <div className="aspect-[3/4] overflow-hidden border border-line">
                        <ItemImage photo={(p as Item).photo} name={p.name} category={p.category} colours={p.colours} />
                      </div>
                      <p className="text-[10px] text-center mt-2 text-graphite leading-snug">{p.name}</p>
                    </div>
                  ))}
                  {pairs.length === 0 && <p className="col-span-3 eyebrow text-center">No pairings yet.</p>}
                </div>
              </div>
            )}
            {hero && pairs.length > 0 && (
              <div className="text-center mt-8">
                <button
                  onClick={() => saveLook(`${hero.name}`, [hero.id, ...pairs.map((p) => p.id)])}
                  className="border border-ink text-ink text-[11px] uppercase tracking-wide2 px-5 py-2 hover:bg-ink hover:text-paper transition-colors"
                >
                  Save this look
                </button>
                {savedMsg && <p className="eyebrow mt-3">{savedMsg}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {mode === "diary" && <WearLog />}
    </Shell>
  );
}
