"use client";

import { useEffect, useState } from "react";
import { fileToJpeg } from "@/lib/imageClient";
import { tryOnCategory } from "@/lib/vocab";
import { Modal } from "@/components/Modal";

export type TryOnProduct = {
  brand: string;
  name: string;
  price?: string;
  link?: string;
  category?: string;
  productImage?: string;
  archetype?: string;
  accessories?: { brand?: string; name?: string; price?: string; link?: string }[];
};

// Virtual try-on for a single garment. Behind NEXT_PUBLIC_TRYON. The reference photo is
// stored server-side (set once, used on every device) and background-removed server-side
// (if REMOVE_BG_API_KEY is set). The result opens in a modal, not inline. When `product`
// is supplied (Discover), the result modal offers "Save to wishlist".
export function TryOn({ garmentUrl, category, product }: { garmentUrl: string | null; category: string | null; product?: TryOnProduct }) {
  const enabled = process.env.NEXT_PUBLIC_TRYON === "1";
  const klass = tryOnCategory(category);
  const [refSet, setRefSet] = useState<boolean | null>(null);
  const [refPreview, setRefPreview] = useState<string | null>(null);
  const [bgWarn, setBgWarn] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [resultPath, setResultPath] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "dup" | "error">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    fetch("/api/reference").then((r) => r.json()).then((d) => { setRefSet(!!d.set); setRefPreview(d.preview || null); }).catch(() => setRefSet(false));
  }, [enabled]);

  if (!enabled) return null;
  if (!klass) return <p className="eyebrow mt-6 text-center">Try-on works on clothing — not bags, shoes or jewellery.</p>;
  if (refSet === null) return null;

  async function pickReference(file: File) {
    setError("");
    setProcessing(true);
    try {
      const { blob } = await fileToJpeg(file, 1280);
      const fd = new FormData();
      fd.append("file", new File([blob], "reference.jpg", { type: "image/jpeg" }));
      const d = await fetch("/api/reference", { method: "POST", body: fd }).then((r) => r.json()).catch(() => ({}));
      if (d.ok) { setRefSet(true); setRefPreview(d.preview || null); setBgWarn(!d.bgRemoved); }
      else setError(d.error || "Couldn't save the photo");
    } catch {
      setError("Couldn't read that photo.");
    } finally {
      setProcessing(false);
    }
  }

  async function run() {
    if (!garmentUrl || !klass) return;
    setModalOpen(true);
    setBusy(true);
    setError("");
    setResult(null);
    setResultPath(null);
    setSaveState("idle");
    const res = await fetch("/api/tryon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ garmentImage: garmentUrl, category: klass })
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (d.url) { setResult(d.url); setResultPath(d.pathname || null); }
    else setError(d.error || "Try-on failed");
  }

  async function saveToWishlist() {
    if (!product) return;
    setSaveState("saving");
    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product, tryonPathname: resultPath })
    });
    const d = await res.json().catch(() => ({}));
    setSaveState(res.ok ? (d.duplicate ? "dup" : "saved") : "error");
  }

  const picker = (label: string) => (
    <label className="block text-center cursor-pointer border border-ink text-ink text-[11px] uppercase tracking-wide2 py-3 hover:bg-ink hover:text-paper transition-colors">
      {label}
      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && pickReference(e.target.files[0])} />
    </label>
  );

  return (
    <div className="mt-6">
      {processing ? (
        <p className="eyebrow text-center">Setting your photo (removing background)…</p>
      ) : !refSet ? (
        picker("Set your photo to try things on")
      ) : (
        <>
          {refPreview && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-16 bg-paper overflow-hidden border border-line shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={refPreview} alt="your photo" className="h-full w-full object-cover" />
              </div>
              <p className="eyebrow">Your photo {bgWarn ? "(background kept)" : "(background removed)"}</p>
            </div>
          )}
          <button
            onClick={run}
            disabled={busy || !garmentUrl}
            className="w-full border border-ink text-ink text-[11px] uppercase tracking-wide2 py-3 hover:bg-ink hover:text-paper transition-colors"
          >
            {busy ? "Dressing you… (~15s)" : "Try it on you"}
          </button>
          <p className="eyebrow mt-3 text-center">
            <label className="cursor-pointer hover:text-ink">
              change your photo
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && pickReference(e.target.files[0])} />
            </label>
          </p>
        </>
      )}
      {error && !modalOpen && <p className="text-sale text-xs mt-3 uppercase tracking-wide2">{error}</p>}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Try it on">
        {busy ? (
          <p className="eyebrow text-center py-12">Dressing you… (~15s)</p>
        ) : result ? (
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result} alt="you wearing it" className="w-full rounded-md" />
            {product && (
              <div className="mt-5 text-center">
                {saveState === "saved" ? (
                  <p className="eyebrow">Saved to your wishlist ✓</p>
                ) : saveState === "dup" ? (
                  <p className="eyebrow">Already on your wishlist</p>
                ) : (
                  <button
                    onClick={saveToWishlist}
                    disabled={saveState === "saving"}
                    className="border border-ink text-ink text-[11px] uppercase tracking-wide2 px-5 py-2 hover:bg-ink hover:text-paper transition-colors"
                  >
                    {saveState === "saving" ? "Saving…" : "Save to wishlist"}
                  </button>
                )}
                {saveState === "error" && <p className="text-sale text-xs mt-2 uppercase tracking-wide2">Couldn&apos;t save</p>}
              </div>
            )}
            <button onClick={run} className="eyebrow mt-4 hover:text-ink block mx-auto">Try another</button>
          </div>
        ) : error ? (
          <p className="text-sale text-xs uppercase tracking-wide2 text-center py-12">{error}</p>
        ) : null}
      </Modal>
    </div>
  );
}
