"use client";

import { useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { extractFrames } from "@/lib/videoFrames";
import { CATEGORIES, STATUSES } from "@/lib/vocab";

type Cand = {
  localId: string;
  preview: string;
  name: string;
  category: string;
  status: string;
  colours: string[];
  designer: string;
  fabric: string[];
  occasion: string[];
  notes: string;
  saving: boolean;
  saved: boolean;
};

type Phase = "idle" | "extracting" | "analysing" | "review";

export default function Film() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [cands, setCands] = useState<Cand[]>([]);
  const [savingAll, setSavingAll] = useState(false);
  const [error, setError] = useState("");

  const update = (id: string, patch: Partial<Cand>) =>
    setCands((c) => c.map((x) => (x.localId === id ? { ...x, ...patch } : x)));

  async function onVideo(file: File) {
    setError("");
    setCands([]);
    try {
      setPhase("extracting");
      const frames = await extractFrames(file);
      if (!frames.length) { setError("No frames could be read from that video."); setPhase("idle"); return; }

      setPhase("analysing");
      const res = await fetch("/api/extract-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frames: frames.map((f) => f.base64) })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(data.items)) { setError(data.error || "Couldn't read the video"); setPhase("idle"); return; }

      const next: Cand[] = data.items.map((it: any, i: number) => ({
        localId: `${Date.now()}-${i}`,
        preview: (frames[it.frameIndex] || frames[0]).dataUrl,
        name: it.name || "",
        category: CATEGORIES.includes(it.category) ? it.category : "Dress",
        status: "Owns",
        colours: Array.isArray(it.colours) ? it.colours : [],
        designer: it.designer || "",
        fabric: Array.isArray(it.fabric) ? it.fabric : [],
        occasion: Array.isArray(it.occasion) ? it.occasion : [],
        notes: it.notes || "",
        saving: false,
        saved: false
      }));
      setCands(next);
      setPhase("review");
    } catch (e: any) {
      setError(e?.message || "Something went wrong reading the video.");
      setPhase("idle");
    }
  }

  async function saveAll() {
    setSavingAll(true);
    for (const cand of cands) {
      if (cand.saved || !cand.name) continue;
      update(cand.localId, { saving: true });
      try {
        const blob = await (await fetch(cand.preview)).blob();
        const fd = new FormData();
        fd.append("file", new File([blob], "frame.jpg", { type: "image/jpeg" }));
        const up = await fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json()).catch(() => ({}));
        const res = await fetch("/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: cand.name, category: cand.category, status: cand.status,
            colours: cand.colours, designer: cand.designer, fabric: cand.fabric,
            occasion: cand.occasion, notes: cand.notes, photo: up.url || null
          })
        });
        update(cand.localId, { saving: false, saved: res.ok });
      } catch {
        update(cand.localId, { saving: false });
      }
    }
    setSavingAll(false);
  }

  const pending = cands.filter((c) => !c.saved && c.name).length;

  return (
    <Shell>
      <div className="text-center mb-10">
        <p className="eyebrow mb-3">Closet weekend</p>
        <h1 className="font-display text-5xl tracking-tight">Film your closet</h1>
        <p className="mt-4 text-sm text-graphite max-w-md mx-auto leading-relaxed">
          Slowly show me each piece — hold it up or flip through the rail, a second or two each — and I&rsquo;ll log them. Then check the list and save.
        </p>
      </div>

      {phase === "idle" && (
        <div className="text-center mb-10">
          <label className="btn-solid cursor-pointer inline-block">
            Add a video
            <input type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && onVideo(e.target.files[0])} />
          </label>
          <Link href="/import" className="block mt-4 eyebrow hover:text-ink">Or upload photos instead →</Link>
          {error && <p className="text-sale text-xs mt-4 uppercase tracking-wide2">{error}</p>}
        </div>
      )}

      {(phase === "extracting" || phase === "analysing") && (
        <p className="text-center eyebrow py-16">
          {phase === "extracting" ? "Reading the video…" : "Spotting your pieces…"}
        </p>
      )}

      {phase === "review" && (
        <>
          <p className="eyebrow text-center mb-6">{cands.length} pieces found — check, fix, and save</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-8 mb-12">
            {cands.map((c) => (
              <div key={c.localId} className={c.saved ? "opacity-50" : ""}>
                <div className="aspect-[3/4] bg-paper overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.preview} alt={c.name || "piece"} className="h-full w-full object-cover" />
                </div>
                <input value={c.name} onChange={(e) => update(c.localId, { name: e.target.value })} placeholder="Name" className="underline-input mt-3 text-sm" />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <select value={c.category} onChange={(e) => update(c.localId, { category: e.target.value })} className="bg-white text-[11px] uppercase tracking-wide2 text-graphite focus:outline-none">
                    {CATEGORIES.map((x) => <option key={x}>{x}</option>)}
                  </select>
                  <select value={c.status} onChange={(e) => update(c.localId, { status: e.target.value })} className="bg-white text-[11px] uppercase tracking-wide2 text-graphite focus:outline-none">
                    {STATUSES.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </div>
                <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wide2">
                  {c.saved ? <span className="text-graphite">Saved ✓</span> : <span className="text-graphite">{[c.designer, c.colours[0]].filter(Boolean).join(" · ")}</span>}
                  {!c.saved && <button onClick={() => setCands((cs) => cs.filter((x) => x.localId !== c.localId))} className="text-graphite hover:text-sale">Remove</button>}
                </div>
              </div>
            ))}
          </div>
          <div className="text-center">
            <button onClick={saveAll} disabled={!pending || savingAll} className="btn-solid">
              {savingAll ? "Saving…" : `Save all (${pending})`}
            </button>
            {error && <p className="text-sale text-xs mt-4 uppercase tracking-wide2">{error}</p>}
          </div>
        </>
      )}
    </Shell>
  );
}
