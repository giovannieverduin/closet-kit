"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Shell from "@/components/Shell";
import { ItemImage } from "@/components/ItemImage";
import { WornBefore } from "@/components/WornBefore";
import { TryOn } from "@/components/TryOn";
import { Field, ChipGroup } from "@/components/Fields";
import { fileToJpeg } from "@/lib/imageClient";
import { CATEGORIES, COLOURS, DESIGNERS, FABRICS, OCCASIONS, SEASONS, STATUSES } from "@/lib/vocab";
import { paletteTier } from "@/lib/profile";

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Dress");
  const [status, setStatus] = useState("Owns");
  const [designer, setDesigner] = useState("Other");
  const [colours, setColours] = useState<string[]>([]);
  const [fabric, setFabric] = useState<string[]>([]);
  const [occasion, setOccasion] = useState<string[]>([]);
  const [season, setSeason] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [link, setLink] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photoStaged, setPhotoStaged] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/items/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.item) { setMissing(true); return; }
        const it = d.item;
        setName(it.name || "");
        setCategory(it.category || "Dress");
        setStatus(it.status || "Owns");
        setDesigner(it.designer || "");
        setColours(it.colours || []);
        setFabric(it.fabric || []);
        setOccasion(it.occasion || []);
        setSeason(it.season || []);
        setNotes(it.notes || "");
        setLink(it.link || "");
        setPhoto(it.photo || null);
      })
      .catch(() => setMissing(true))
      .finally(() => setLoading(false));
  }, [id]);

  // Any edit clears the saved confirmation so the button reflects unsaved changes again.
  // (Doesn't fire right after a save — the field values are unchanged then.)
  useEffect(() => {
    setSaved(false);
  }, [name, category, status, designer, colours, fabric, occasion, season, notes, link, photo]);

  const toggle = (set: (f: (p: string[]) => string[]) => void) => (c: string) =>
    set((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  async function replacePhoto(file: File) {
    setUploading(true);
    setError("");
    try {
      const { blob } = await fileToJpeg(file);
      const fd = new FormData();
      fd.append("file", new File([blob], "item.jpg", { type: "image/jpeg" }));
      const d = await fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json());
      if (d.url) { setPhoto(d.url); setPhotoStaged(true); }
      else setError(d.error || "Upload failed");
    } catch {
      setError("Couldn't read that image.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setBusy(true);
    setError("");
    setSaved(false);
    const res = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category, status, designer, colours, fabric, occasion, season, notes, link, photo })
    });
    setBusy(false);
    if (res.ok) { setSaved(true); setPhotoStaged(false); }
    else { const d = await res.json().catch(() => ({})); setError(d.error || "Couldn't save"); }
  }

  async function remove() {
    if (!window.confirm("Remove this piece from the closet?")) return;
    await fetch(`/api/items/${id}`, { method: "DELETE" });
    router.push("/");
  }

  if (loading) return <Shell><p className="text-center eyebrow">Loading the piece…</p></Shell>;
  if (missing) return <Shell><p className="text-center eyebrow">Piece not found. <Link href="/" className="underline">Back to closet</Link></p></Shell>;

  return (
    <Shell>
      <div className="mb-8">
        <Link href="/" className="eyebrow hover:text-ink">← Closet</Link>
      </div>

      <div className="grid md:grid-cols-2 gap-12 items-start">
        <div>
          <div className="aspect-[3/4] bg-paper overflow-hidden">
            <ItemImage photo={photo} name={name} category={category} colours={colours} />
          </div>
          <label className="mt-4 block text-center cursor-pointer eyebrow hover:text-ink">
            {uploading ? "Uploading…" : "Replace photo"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && replacePhoto(e.target.files[0])} />
          </label>
          {photoStaged && !saved && (
            <p className="text-center mt-2 text-[11px] uppercase tracking-wide2 text-ink">New photo added — save changes to keep it</p>
          )}
          <WornBefore itemId={id} />
          <TryOn garmentUrl={photo} category={category} />
        </div>

        <div className="space-y-7">
          <Field label="What is it">
            <input value={name} onChange={(e) => setName(e.target.value)} className="underline-input" />
          </Field>
          <div className="grid grid-cols-3 gap-5">
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
          {colours.some((c) => paletteTier(c) === "caution") && (
            <p className="-mt-4 text-[11px] text-graphite italic leading-snug">
              Off your palette — a cool or greyed tone. Best kept to an accent, away from your face. <Link href="/palette" className="underline hover:text-ink not-italic">See your palette →</Link>
            </p>
          )}
          <ChipGroup label="Occasion" options={OCCASIONS} selected={occasion} onToggle={toggle(setOccasion)} />
          <ChipGroup label="Season" options={SEASONS} selected={season} onToggle={toggle(setSeason)} />
          <Field label="Link">
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" className="underline-input" />
          </Field>
          <Field label="Notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="underline-input resize-none" />
          </Field>

          {error && <p className="text-sale text-xs uppercase tracking-wide2">{error}</p>}
          {saved && (
            <p className="flex items-center gap-2 text-sm text-ink">
              <span aria-hidden className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-ink text-paper text-[11px]">✓</span>
              Saved to your closet.
            </p>
          )}
          <div className="flex items-center gap-6">
            <button
              onClick={save}
              disabled={busy || uploading || saved}
              className={`btn-solid ${saved ? "!bg-transparent !text-ink !border !border-ink !cursor-default !opacity-100" : ""}`}
            >
              {busy ? "Saving…" : saved ? "✓ Saved" : "Save changes"}
            </button>
            <button onClick={remove} className="eyebrow text-graphite hover:text-sale">Remove</button>
          </div>
        </div>
      </div>
    </Shell>
  );
}
