"use client";

import { useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { fileToJpeg, compressTransparent } from "@/lib/imageClient";
import { removeBg } from "@/lib/bgRemove";
import { CATEGORIES, COLOURS, STATUSES } from "@/lib/vocab";

// The dedicated inbox that receipts can be forwarded to (inbound-email import flow).
// Override per-deploy with NEXT_PUBLIC_CLOSET_EMAIL; defaults to the app's closet address.
const CLOSET_INBOX = process.env.NEXT_PUBLIC_CLOSET_EMAIL || "closet@example.com";

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

type Cand = {
  localId: string;
  preview: string;
  photo: string | null;
  name: string;
  category: string;
  status: string;
  colours: string[];
  designer: string;
  fabric: string[];
  occasion: string[];
  notes: string;
  reading: boolean;
  bgBusy: boolean;
  saving: boolean;
  saved: boolean;
  include: boolean;
  link?: string;
  fromReceipt?: boolean;
};

export default function Import() {
  const [cands, setCands] = useState<Cand[]>([]);
  const [savingAll, setSavingAll] = useState(false);
  const [removeBackgrounds, setRemoveBackgrounds] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");

  const update = (id: string, patch: Partial<Cand>) =>
    setCands((c) => c.map((x) => (x.localId === id ? { ...x, ...patch } : x)));

  async function onFiles(files: FileList) {
    for (const file of Array.from(files)) {
      const localId = `${Date.now()}-${Math.random()}`;
      try {
        const j = await fileToJpeg(file);
        setCands((c) => [...c, {
          localId, preview: j.dataUrl, photo: null, name: "", category: "Dress", status: "Owns",
          colours: [], designer: "Other", fabric: [], occasion: [], notes: "",
          reading: true, bgBusy: removeBackgrounds, saving: false, saved: false, include: true
        }]);

        // Background removal runs one image at a time so big batches stay within memory;
        // falls back to the original cleanly if it fails.
        let blob = j.blob;
        let fname = "item.jpg";
        let ftype = "image/jpeg";
        if (removeBackgrounds) {
          const cut = await removeBg(file);
          if (cut) {
            // Shrink the full-res transparent cutout before upload (avoids the 4.5MB 413).
            const small = await compressTransparent(cut);
            blob = small; ftype = small.type || "image/webp"; fname = `item.${ftype.split("/")[1] || "webp"}`;
            try { update(localId, { preview: await blobToDataURL(small) }); } catch {}
          }
        }
        update(localId, { bgBusy: false });

        const fd = new FormData();
        fd.append("file", new File([blob], fname, { type: ftype }));
        const [up, ex] = await Promise.all([
          fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json()).catch(() => ({})),
          fetch("/api/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageBase64: j.base64, mediaType: "image/jpeg" }) }).then((r) => r.json()).catch(() => ({}))
        ]);
        const it = ex.item || {};
        update(localId, {
          reading: false, photo: up.url || null,
          name: it.name || "", category: it.category || "Dress",
          colours: it.colours || [], designer: it.designer || "Other",
          fabric: it.fabric || [], occasion: it.occasion || [], notes: it.notes || ""
        });
      } catch {
        update(localId, { reading: false, bgBusy: false });
      }
    }
  }

  // Parse screenshot(s) of an order confirmation / receipt into several catalogue candidates.
  // Multiple screenshots are treated as pages of ONE order. Items come in photo-less; add images
  // later via the item page or the Tidy tool.
  async function onReceipt(files: FileList) {
    setParsing(true);
    setError("");
    try {
      const imgs: { base64: string; mediaType: string }[] = [];
      for (const f of Array.from(files)) {
        const j = await fileToJpeg(f);
        imgs.push({ base64: j.base64, mediaType: "image/jpeg" });
      }
      const res = await fetch("/api/import-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: imgs })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || "Couldn't read that receipt."); return; }
      const items: any[] = Array.isArray(d.items) ? d.items : [];
      if (items.length === 0) { setError("No fashion items found in that screenshot."); return; }
      const inList = (v: string, list: readonly string[]) => list.includes(v);
      const mapped: Cand[] = items.map((it: any, i: number) => {
        const priceNote = [it.currency, it.price].filter(Boolean).join(" ");
        return {
          localId: `r-${Date.now()}-${i}`,
          preview: it.imageUrl || "",
          photo: it.imageUrl || null,
          name: it.name || "",
          category: it.category && inList(it.category, CATEGORIES) ? it.category : "Dress",
          status: "Owns",
          colours: Array.isArray(it.colours) ? it.colours.filter((c: string) => inList(c, COLOURS)) : [],
          designer: it.brand || "Other",
          fabric: [], occasion: [],
          notes: priceNote ? `Paid ${priceNote}` : "",
          reading: false, bgBusy: false, saving: false, saved: false, include: true,
          link: it.productUrl || "",
          fromReceipt: true
        };
      });
      setCands((c) => [...c, ...mapped]);
    } catch {
      setError("Couldn't read that receipt — try a clearer screenshot.");
    } finally {
      setParsing(false);
    }
  }

  async function saveAll() {
    setSavingAll(true);
    for (const cand of cands) {
      // Skip anything still processing, unnamed, or without a saved photo (guard against blanks).
      // Photo-less is allowed only for receipt-imported items (add a photo later via Tidy).
      if (cand.saved || !cand.include || cand.reading || cand.bgBusy || !cand.name || (!cand.photo && !cand.fromReceipt)) continue;
      update(cand.localId, { saving: true });
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cand.name, category: cand.category, status: cand.status,
          colours: cand.colours, designer: cand.designer, fabric: cand.fabric,
          occasion: cand.occasion, notes: cand.notes, photo: cand.photo, link: cand.link || ""
        })
      });
      update(cand.localId, { saving: false, saved: res.ok });
    }
    setSavingAll(false);
  }

  const pending = cands.filter((c) => c.include && !c.saved && !c.reading && !c.bgBusy && c.name && (c.photo || c.fromReceipt)).length;

  return (
    <Shell>
      <div className="text-center mb-10">
        <p className="eyebrow mb-3">Closet weekend</p>
        <h1 className="font-display text-5xl tracking-tight">Catalogue several at once</h1>
        <p className="mt-4 text-sm text-graphite max-w-md mx-auto leading-relaxed">
          Pick a batch of photos — I read each one. Glance over them, fix anything, save the lot.
        </p>
      </div>

      <div className="text-center mb-10">
        <label className="btn-solid cursor-pointer inline-block">
          Add photos
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && onFiles(e.target.files)} />
        </label>
        <label className="mt-4 flex items-center justify-center gap-2 text-[11px] uppercase tracking-wide2 text-graphite cursor-pointer">
          <input type="checkbox" checked={removeBackgrounds} onChange={(e) => setRemoveBackgrounds(e.target.checked)} className="accent-ink" />
          Remove backgrounds
        </label>

        <div className="mt-7 pt-5 border-t border-line max-w-sm mx-auto">
          <p className="eyebrow mb-3 text-graphite">Or import a purchase</p>
          <label className={`cursor-pointer inline-block text-[11px] uppercase tracking-wide2 border border-ink px-4 py-2 transition-colors ${parsing ? "opacity-50" : "text-ink hover:bg-ink hover:text-paper"}`}>
            {parsing ? "Reading receipt…" : "Receipt / order screenshot"}
            <input type="file" accept="image/*" multiple disabled={parsing} className="hidden" onChange={(e) => e.target.files && onReceipt(e.target.files)} />
          </label>
          <p className="mt-2 text-[10px] text-graphite normal-case tracking-normal leading-relaxed">
            Screenshot(s) of an order confirmation — I&rsquo;ll pull out each item (multiple screenshots = one order). Add photos later in Tidy.
          </p>

          <div className="mt-5 pt-4 border-t border-line">
            <p className="eyebrow mb-2 text-graphite">Or forward it in</p>
            <p className="text-[10px] text-graphite normal-case tracking-normal leading-relaxed">
              Forward the order-confirmation email to{" "}
              <span className="text-ink break-all">{CLOSET_INBOX}</span> and each piece lands in
              your closet on its own, with a clean product photo pulled from the brand&rsquo;s site.
              No screenshot, no typing.
            </p>
          </div>
        </div>
        {error && <p className="mt-4 text-sale text-xs uppercase tracking-wide2">{error}</p>}

        <div className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2">
          <Link href="/film" className="eyebrow hover:text-ink">Film your closet →</Link>
          <Link href="/add" className="eyebrow hover:text-ink">Add one at a time →</Link>
        </div>
      </div>

      {cands.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-8 mb-12">
            {cands.map((c) => (
              <div key={c.localId} className={c.saved ? "opacity-50" : ""}>
                <div className="aspect-[3/4] bg-paper overflow-hidden relative">
                  {c.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.preview} alt={c.name || "piece"} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center text-center px-3 gap-1">
                      <span className="eyebrow text-graphite">{c.designer && c.designer !== "Other" ? c.designer : "From receipt"}</span>
                      <span className="text-[10px] text-graphite normal-case tracking-normal">add a photo in Tidy</span>
                    </div>
                  )}
                  {(c.bgBusy || c.reading) && <div className="absolute inset-0 bg-paper/60 flex items-center justify-center"><span className="eyebrow">{c.bgBusy ? "Lifting bg…" : "Reading…"}</span></div>}
                </div>
                <input
                  value={c.name}
                  onChange={(e) => update(c.localId, { name: e.target.value })}
                  placeholder={c.reading ? "…" : "Name"}
                  className="underline-input mt-3 text-sm"
                />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <select value={c.category} onChange={(e) => update(c.localId, { category: e.target.value })} className="bg-white text-[11px] uppercase tracking-wide2 text-graphite focus:outline-none">
                    {CATEGORIES.map((x) => <option key={x}>{x}</option>)}
                  </select>
                  <select value={c.status} onChange={(e) => update(c.localId, { status: e.target.value })} className="bg-white text-[11px] uppercase tracking-wide2 text-graphite focus:outline-none">
                    {STATUSES.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </div>
                <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wide2">
                  {c.saved ? <span className="text-graphite">Saved ✓</span>
                    : (!c.photo && !c.fromReceipt && !c.reading && !c.bgBusy) ? <span className="text-sale">⚠ photo didn&rsquo;t upload</span>
                    : <span className="text-graphite">{c.colours.slice(0, 2).join(" · ")}</span>}
                  {!c.saved && <button onClick={() => setCands((cs) => cs.filter((x) => x.localId !== c.localId))} className="text-graphite hover:text-sale">Remove</button>}
                </div>
              </div>
            ))}
          </div>
          <div className="text-center">
            <button onClick={saveAll} disabled={!pending || savingAll} className="btn-solid">
              {savingAll ? "Saving…" : `Save all (${pending})`}
            </button>
          </div>
        </>
      )}
    </Shell>
  );
}
