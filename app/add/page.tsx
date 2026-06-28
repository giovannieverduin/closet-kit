"use client";

import { useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { fileToJpeg, compressTransparent, rotate90 } from "@/lib/imageClient";
import { removeBg } from "@/lib/bgRemove";
import { CATEGORIES, COLOURS, DESIGNERS, FABRICS, OCCASIONS, STATUSES } from "@/lib/vocab";

type Dupe = { id: string; name: string; designer: string | null; category: string | null; status: string | null; photo: string | null; reason: string };

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

export default function Add() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("Dress");
  const [status, setStatus] = useState<string>("Owns");
  const [designer, setDesigner] = useState<string>("");
  const [colours, setColours] = useState<string[]>([]);
  const [fabric, setFabric] = useState<string[]>([]);
  const [occasion, setOccasion] = useState<string[]>([]);
  const [link, setLink] = useState("");
  const [notes, setNotes] = useState("");

  // Image: keep the original and the (optional) background-removed cut-out.
  const [original, setOriginal] = useState<{ blob: Blob; dataUrl: string } | null>(null);
  const [cutout, setCutout] = useState<{ blob: Blob; dataUrl: string } | null>(null);
  const [useCutout, setUseCutout] = useState(true);
  const [bgBusy, setBgBusy] = useState(false);
  const [rotating, setRotating] = useState(false);

  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [dupes, setDupes] = useState<Dupe[]>([]);

  // "Find original product image" — a clean stock shot fetched from the product page.
  const [finding, setFinding] = useState(false);
  const [found, setFound] = useState<{ image: string | null; title: string | null; price: string | null } | null>(null);
  const [cleanPhoto, setCleanPhoto] = useState<string | null>(null);

  const preview = cleanPhoto || (useCutout && cutout ? cutout.dataUrl : original?.dataUrl) || null;

  const inList = (v: string, list: readonly string[]) => list.includes(v);
  const toggle = (set: (f: (p: string[]) => string[]) => void) => (c: string) =>
    set((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  function prefill(it: any) {
    if (it.name) setName(it.name);
    if (it.category && inList(it.category, CATEGORIES)) setCategory(it.category);
    if (Array.isArray(it.colours)) setColours(it.colours.filter((c: string) => inList(c, COLOURS)));
    setDesigner(it.designer || "");
    if (Array.isArray(it.fabric)) setFabric(it.fabric.filter((c: string) => inList(c, FABRICS)));
    if (Array.isArray(it.occasion)) setOccasion(it.occasion.filter((c: string) => inList(c, OCCASIONS)));
    if (it.notes) setNotes(it.notes);
  }

  // Non-blocking "you may already own this" check against the closet.
  async function checkDupes(d: { name: string; category: string; designer: string; colours: string[] }) {
    if (!d.name && !d.designer) return;
    try {
      const res = await fetch("/api/dupe-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d)
      });
      const data = await res.json();
      setDupes(Array.isArray(data.matches) ? data.matches : []);
    } catch {
      setDupes([]);
    }
  }

  // Fetch a clean product image (+ title/price) from the entered link.
  async function findProduct() {
    setError("");
    setFound(null);
    setFinding(true);
    try {
      // Always send the description + photo alongside any link. Many retailers bot-wall the
      // link fetch (Ounass, Farfetch, NET-A-PORTER…), so the server falls back to a web search
      // using these details when the pasted page can't be read.
      const payload: any = {
        productUrl: link || undefined,
        brand: designer || undefined,
        name: name || undefined,
        colours,
        category
      };
      if (original) {
        payload.imageBase64 = original.dataUrl.split(",")[1];
        payload.mediaType = "image/jpeg";
      }
      const res = await fetch("/api/find-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.image) setFound({ image: data.image, title: data.title, price: data.price });
      else setError(data.error || "Couldn't find a product image for that link.");
    } catch {
      setError("Couldn't reach the product page.");
    } finally {
      setFinding(false);
    }
  }
  function acceptFound() {
    if (found?.image) {
      setCleanPhoto(found.image);
      if (!name && found.title) setName(found.title);
    }
    setFound(null);
  }

  async function onUpload(file: File) {
    setError("");
    setDone(false);
    setDupes([]);
    setCutout(null);
    setUseCutout(true);
    setCleanPhoto(null);
    setFound(null);
    setReading(true);
    try {
      const { base64, blob, dataUrl } = await fileToJpeg(file);
      setOriginal({ blob, dataUrl });

      // In-browser background removal (free, private — the photo never leaves the device).
      // The ML runtime is loaded from CDN at runtime (webpackIgnore) so Next never bundles it.
      // Feed it the orientation-normalised blob (not the raw file) so the cut-out is upright too.
      setBgBusy(true);
      (async () => {
        const cut = await removeBg(blob);
        if (cut) {
          try {
            // Shrink the full-res transparent cutout before it is ever uploaded.
            const small = await compressTransparent(cut);
            setCutout({ blob: small, dataUrl: await blobToDataURL(small) });
          }
          catch { setUseCutout(false); }
        } else {
          setUseCutout(false); // fall back to the original cleanly
        }
        setBgBusy(false);
      })();

      // Auto-read attributes from the original, then check for duplicates.
      const ex = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType: "image/jpeg" })
      }).then((r) => r.json()).catch(() => ({}));
      if (ex.item) {
        prefill(ex.item);
        checkDupes({
          name: ex.item.name || "",
          category: ex.item.category || "",
          designer: ex.item.designer || "",
          colours: Array.isArray(ex.item.colours) ? ex.item.colours : []
        });
      } else if (ex.error) {
        setError(ex.error);
      }
    } catch {
      setError("Couldn't read that image — try a JPG or PNG.");
    } finally {
      setReading(false);
    }
  }

  // Manual 90° rotate (clockwise). Rotates both the original and the cut-out so whichever is
  // saved comes out the right way up — deterministic, since EXIF auto-orientation is unreliable.
  async function rotate() {
    if (!original && !cutout) return;
    setRotating(true);
    setError("");
    try {
      if (original) {
        const r = await rotate90(original.blob);
        setOriginal({ blob: r.blob, dataUrl: r.dataUrl });
      }
      if (cutout) {
        const r = await rotate90(cutout.blob);
        setCutout({ blob: r.blob, dataUrl: r.dataUrl });
      }
    } catch {
      setError("Couldn't rotate that image — try re-uploading.");
    } finally {
      setRotating(false);
    }
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      // Prefer an accepted clean product image (already a URL) over uploading the snapshot.
      let photo: string | null = cleanPhoto;
      const chosen = useCutout && cutout ? cutout.blob : original?.blob;
      if (!photo && chosen) {
        const fd = new FormData();
        const ext = (chosen.type && chosen.type.split("/")[1]) || (useCutout && cutout ? "webp" : "jpg");
        fd.append("file", new File([chosen], `item.${ext}`, { type: chosen.type || "image/jpeg" }));
        const up = await fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json()).catch(() => ({}));
        photo = up.url || null;
        // Resilience guard: never silently catalogue a photo-less entry after a failed upload.
        if (!photo) {
          setBusy(false);
          setError("Your photo couldn't be saved — check your connection and try again. The piece was not added.");
          return;
        }
      }
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category, status, designer, colours, fabric, occasion, link, notes, photo })
      });
      const data = await res.json().catch(() => ({}));
      setBusy(false);
      if (res.ok) {
        setDone(true);
        setName(""); setColours([]); setFabric([]); setOccasion([]); setDesigner("");
        setLink(""); setNotes(""); setOriginal(null); setCutout(null); setDupes([]);
        setCleanPhoto(null); setFound(null);
      } else setError(data.error || "Couldn't save");
    } catch (e: any) {
      setBusy(false);
      setError(e.message || "Couldn't save");
    }
  }

  return (
    <Shell>
      <div className="text-center mb-12">
        <p className="eyebrow mb-3">New Piece</p>
        <h1 className="font-display text-5xl tracking-tight">Catalogue a piece</h1>
        <p className="mt-4 text-sm text-graphite max-w-md mx-auto leading-relaxed">
          Snap a photo and I read it for you — I&rsquo;ll even lift the background. Then just check the details and save.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2">
          <Link href="/import" className="eyebrow hover:text-ink">Do several at once →</Link>
          <Link href="/film" className="eyebrow hover:text-ink">Film your closet →</Link>
        </div>
      </div>

      <div className="max-w-xl mx-auto space-y-9">
        <div>
          <label
            className="block aspect-[3/4] max-w-[220px] mx-auto overflow-hidden cursor-pointer flex items-center justify-center border border-line"
            style={useCutout && cutout ? {
              backgroundImage: "linear-gradient(45deg,#f0f0ee 25%,transparent 25%,transparent 75%,#f0f0ee 75%),linear-gradient(45deg,#f0f0ee 25%,transparent 25%,transparent 75%,#f0f0ee 75%)",
              backgroundSize: "16px 16px",
              backgroundPosition: "0 0,8px 8px"
            } : { background: "#FAFAF9" }}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="upload preview" className="h-full w-full object-contain" />
            ) : (
              <span className="eyebrow text-center px-6">{reading ? "Reading the piece…" : "Tap to add a photo"}</span>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
          </label>
          <div className="flex justify-center gap-6 mt-3">
            <label className="text-[10px] uppercase tracking-wide2 text-graphite hover:text-ink cursor-pointer">
              Take a photo
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
            </label>
            <label className="text-[10px] uppercase tracking-wide2 text-graphite hover:text-ink cursor-pointer">
              Upload a photo
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
            </label>
          </div>
          {bgBusy && <p className="eyebrow text-center mt-3">Lifting the background…</p>}
          {reading && !bgBusy && <p className="eyebrow text-center mt-3">Reading colour, cut, designer…</p>}
          {cutout && !bgBusy && (
            <p className="text-center mt-3">
              <button onClick={() => setUseCutout((v) => !v)} className="text-[10px] uppercase tracking-wide2 text-graphite hover:text-ink">
                {useCutout ? "Background removed · use original" : "Use the cut-out"}
              </button>
            </p>
          )}
          {!cleanPhoto && !bgBusy && !reading && (original || cutout || link || name || designer) && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              {(original || cutout) && (
                <button onClick={rotate} disabled={rotating} className="text-[11px] uppercase tracking-wide2 text-graphite hover:text-ink disabled:opacity-40">
                  {rotating ? "Rotating…" : "↻ Rotate 90°"}
                </button>
              )}
              <button
                onClick={findProduct}
                disabled={finding || (!link && !name && !designer && !original)}
                className="text-[11px] uppercase tracking-wide2 text-ink border border-ink px-3 py-1.5 hover:bg-ink hover:text-paper transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink"
              >
                {finding ? "Finding…" : link ? "Find original product image →" : "Find a clean product image →"}
              </button>
            </div>
          )}
          {cleanPhoto && (
            <p className="eyebrow text-center mt-3">
              Using the product&rsquo;s stock image ·{" "}
              <button onClick={() => setCleanPhoto(null)} className="hover:text-ink underline">use my photo instead</button>
            </p>
          )}
          {found?.image && !cleanPhoto && (
            <div className="mt-4 mx-auto max-w-[300px] flex items-center gap-4 border border-line p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={found.image} alt={found.title || "product"} className="w-16 h-20 object-cover bg-paper border border-line shrink-0" />
              <div className="min-w-0">
                {found.title && <p className="text-xs truncate">{found.title}</p>}
                {found.price && <p className="eyebrow mt-1">{found.price}</p>}
                <div className="mt-2 flex gap-4">
                  <button onClick={acceptFound} className="text-[11px] uppercase tracking-wide2 text-ink hover:text-graphite">Use this image</button>
                  <button onClick={() => setFound(null)} className="text-[11px] uppercase tracking-wide2 text-graphite hover:text-ink">Dismiss</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {dupes.length > 0 && (
          <div className="border border-sale/40 bg-sale/[0.03] p-4">
            <div className="flex items-start justify-between">
              <p className="eyebrow text-sale">You may already own this</p>
              <button onClick={() => setDupes([])} className="text-[13px] text-graphite hover:text-ink leading-none">×</button>
            </div>
            <div className="mt-3 space-y-3">
              {dupes.map((d) => (
                <Link key={d.id} href={`/item/${d.id}`} className="flex items-center gap-3 group">
                  <span className="w-10 h-12 bg-paper border border-line overflow-hidden shrink-0 flex items-center justify-center">
                    {d.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.photo} alt={d.name} className="w-full h-full object-cover" />
                    ) : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs truncate group-hover:underline">{d.name}{d.designer ? ` · ${d.designer}` : ""}</span>
                    <span className="block text-[10px] uppercase tracking-wide2 text-graphite">{d.reason}</span>
                  </span>
                </Link>
              ))}
            </div>
            <p className="text-[10px] text-graphite mt-3">Just a heads up — I can still add it below.</p>
          </div>
        )}

        <Field label="What is it">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Coral one-shoulder gown" className="underline-input" />
        </Field>

        <div className="grid grid-cols-3 gap-6">
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="underline-input bg-white">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="underline-input bg-white">
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Designer">
            <input list="designers" value={designer} onChange={(e) => setDesigner(e.target.value)} placeholder="e.g. Bottega Veneta" className="underline-input" />
            <datalist id="designers">{DESIGNERS.map((d) => <option key={d} value={d} />)}</datalist>
          </Field>
        </div>

        <ChipGroup label="Colour" options={COLOURS} selected={colours} onToggle={toggle(setColours)} />
        <ChipGroup label="Fabric" options={FABRICS} selected={fabric} onToggle={toggle(setFabric)} />
        <ChipGroup label="Occasion" options={OCCASIONS} selected={occasion} onToggle={toggle(setOccasion)} />

        <Field label="Link (optional)">
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" className="underline-input" />
        </Field>

        <Field label="Notes (optional)">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="underline-input resize-none" />
        </Field>

        {error && <p className="text-sale text-xs uppercase tracking-wide2">{error}</p>}
        {done && <p className="eyebrow">Catalogued. Snap the next one, or browse the closet.</p>}

        <button onClick={save} disabled={busy || reading || bgBusy || !name} className="btn-solid">
          {busy ? "Saving…" : reading ? "Reading…" : "Save to closet"}
        </button>
      </div>
    </Shell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow block mb-3">{label}</span>
      {children}
    </label>
  );
}

function ChipGroup({ label, options, selected, onToggle }:
  { label: string; options: readonly string[]; selected: string[]; onToggle: (c: string) => void }) {
  return (
    <div>
      <span className="eyebrow block mb-3">{label}</span>
      <div className="flex flex-wrap gap-x-5 gap-y-3 pt-1">
        {options.map((c) => (
          <button
            key={c}
            onClick={() => onToggle(c)}
            className={`text-[11px] uppercase tracking-wide2 transition-colors ${
              selected.includes(c) ? "text-ink border-b border-ink pb-0.5" : "text-graphite hover:text-ink pb-0.5"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
