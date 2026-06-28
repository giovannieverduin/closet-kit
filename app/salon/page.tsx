"use client";

import { useState } from "react";
import Shell from "@/components/Shell";
import { Modal } from "@/components/Modal";
import { fileToJpeg } from "@/lib/imageClient";

type Grp = { label: string; options: string[] };

const COLOUR_GROUPS: Grp[] = [
  { label: "Blonde", options: ["Platinum blonde", "Ice blonde", "Ash blonde", "Champagne blonde", "Honey blonde", "Golden blonde", "Buttery blonde", "Strawberry blonde", "Sandy blonde", "Dark blonde", "Bronde"] },
  { label: "Brown", options: ["Light brown", "Ash brown", "Chestnut brown", "Caramel brown", "Chocolate brown", "Mocha brown", "Espresso brown", "Dark brown"] },
  { label: "Black", options: ["Soft black", "Jet black", "Blue-black"] },
  { label: "Red & copper", options: ["Strawberry copper", "Copper", "Ginger", "Auburn", "Titian red", "Cherry red", "Mahogany", "Burgundy"] },
  { label: "Grey & silver", options: ["Silver", "Steel grey", "Salt and pepper", "White blonde"] },
  { label: "Fashion", options: ["Rose gold", "Pastel pink", "Lavender", "Lilac", "Icy blue", "Teal", "Emerald green", "Peachy"] }
];

const STYLE_GROUPS: Grp[] = [
  { label: "Short", options: ["Pixie cut", "Short crop", "Classic bob", "Blunt bob", "French bob", "Shoulder lob"] },
  { label: "Long", options: ["Long soft layers", "Long blunt cut", "Mid-length layers", "Butterfly layers", "Shag cut", "Wolf cut"] },
  { label: "Texture", options: ["Sleek straight", "Smooth blowout", "Loose waves", "Beachy waves", "Old Hollywood waves", "Soft curls", "Bouncy curls", "Tight curls"] },
  { label: "Fringe & bangs", options: ["Curtain bangs", "Blunt bangs", "Side-swept bangs", "Wispy bangs"] },
  { label: "Up", options: ["Low chignon updo", "Sleek low bun", "Messy bun", "High bun", "French twist", "Braided updo"] },
  { label: "Ponytail & braids", options: ["Sleek high ponytail", "Low ponytail", "Bubble ponytail", "Half-up half-down", "Dutch braids", "Fishtail braid"] }
];

export default function Salon() {
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [style, setStyle] = useState("Keep current");
  const [colour, setColour] = useState("Keep current");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  async function onFile(file: File) {
    setError("");
    setResult(null);
    try {
      const j = await fileToJpeg(file, 1280);
      setPreview(j.dataUrl);
      setBlob(j.blob);
    } catch {
      setError("Couldn't read that photo — try a JPG or PNG.");
    }
  }

  async function run() {
    if (!blob) return;
    setBusy(true);
    setError("");
    setResult(null);
    setSaved(false);
    setSaveErr("");
    try {
      const wantStyle = style !== "Keep current";
      const wantColour = colour !== "Keep current";
      if (!wantStyle && !wantColour) throw new Error("Pick a new style or colour");

      // 1. Host the photo so the hair API can fetch it by URL.
      const fd = new FormData();
      fd.append("file", new File([blob], "me.jpg", { type: "image/jpeg" }));
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const upData = await up.json();
      if (!up.ok) throw new Error(upData.error || "Could not upload photo");

      // 2. Submit the job (server forces editing_type "both" and fills descriptions).
      const sub = await fetch("/api/hair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: upData.url,
          color: wantColour ? colour : "",
          style: wantStyle ? style : ""
        })
      });
      const subData = await sub.json();
      if (!sub.ok) throw new Error(subData.error || "Hair try-on failed");

      if (subData.resultUrl) {
        setResult(subData.resultUrl);
        setOpen(true);
        return;
      }
      const id = subData.requestId;
      if (!id) throw new Error("No job id returned");

      // 3. Poll the job from the browser (it can take a minute), no function timeout.
      const deadline = Date.now() + 180000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 3500));
        const pr = await fetch(`/api/hair?id=${encodeURIComponent(id)}`);
        const pd = await pr.json().catch(() => ({}));
        if (pd.status === "succeeded") {
          if (!pd.resultUrl) throw new Error("Done, but no image came back");
          setResult(pd.resultUrl);
          setOpen(true);
          return;
        }
        if (pd.status === "failed") throw new Error(pd.error || "Hair styling failed");
      }
      throw new Error("Styling is taking longer than usual — please try again");
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function saveToLooks() {
    if (!result) return;
    setSaving(true);
    setSaveErr("");
    try {
      const res = await fetch("/api/salon/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: result, color: colour, style })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Couldn't save");
      setSaved(true);
    } catch (e: any) {
      setSaveErr(e.message || "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell>
      <div className="text-center mb-10">
        <p className="eyebrow mb-3">Before you book the chair</p>
        <h1 className="font-display text-5xl tracking-tight">Try a new look</h1>
        <p className="mt-4 text-sm text-graphite max-w-md mx-auto leading-relaxed">
          A clear, front-facing photo of you works best. Pick a style, a colour, or both, and see it before you commit.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-12 items-start">
        <label className="block aspect-[3/4] bg-paper overflow-hidden cursor-pointer flex items-center justify-center border border-line">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Your photo" className="h-full w-full object-cover" />
          ) : (
            <span className="eyebrow">Tap to add a photo</span>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>

        <div>
          <SelectField label="Colour" value={colour} onChange={setColour} groups={COLOUR_GROUPS} />
          <SelectField label="Style" value={style} onChange={setStyle} groups={STYLE_GROUPS} />
          <button onClick={run} disabled={!blob || busy} className="btn-solid w-full mt-8">
            {busy ? "Styling… (up to a minute)" : "Try it on"}
          </button>
          {error && <p className="text-sale text-xs mt-4 uppercase tracking-wide2">{error}</p>}
          <p className="text-[10px] text-graphite mt-4 leading-relaxed">
            Note: your photo is sent to a third-party styling service to render the result.
          </p>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="The new look" size="xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <p className="eyebrow mb-2">Before</p>
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Before" className="w-full max-h-[68vh] object-contain bg-paper border border-line" />
            )}
          </div>
          <div>
            <p className="eyebrow mb-2">After</p>
            {result && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={result} alt="After" className="w-full max-h-[68vh] object-contain bg-paper border border-line" />
            )}
          </div>
        </div>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
          <a
            href={result ? `/api/download?url=${encodeURIComponent(result)}&name=salon-look.jpg` : "#"}
            download="salon-look.jpg"
            className="btn-solid"
          >
            Save to your device
          </a>
          <button
            onClick={saveToLooks}
            disabled={saving || saved}
            className="border border-ink text-ink text-[11px] uppercase tracking-wide2 px-6 py-3 hover:bg-ink hover:text-paper transition-colors disabled:opacity-50"
          >
            {saved ? "Saved to Looks ✓" : saving ? "Saving…" : "Save to your Looks"}
          </button>
        </div>
        {saveErr && <p className="text-sale text-xs mt-3 text-center uppercase tracking-wide2">{saveErr}</p>}
      </Modal>
    </Shell>
  );
}

function SelectField({ label, value, onChange, groups }: { label: string; value: string; onChange: (v: string) => void; groups: Grp[] }) {
  return (
    <div className="mb-7">
      <p className="eyebrow mb-3">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-line px-3 py-3 text-[12px] tracking-wide2 text-ink focus:outline-none focus:border-ink cursor-pointer"
      >
        <option value="Keep current">Keep current</option>
        {groups.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
