"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import type { Assessment } from "@/lib/anthropic";
import { AssessReveal } from "@/components/AssessReveal";
import { extractPaletteFromImage } from "@/lib/palette";
import { tryOnCategory } from "@/lib/vocab";
import { Modal } from "@/components/Modal";

export default function Assess() {
  const [preview, setPreview] = useState<string | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState("image/jpeg");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Assessment | null>(null);
  const [palette, setPalette] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [savingA, setSavingA] = useState(false);
  const [savedA, setSavedA] = useState(false);
  const [tryBusy, setTryBusy] = useState(false);
  const [tryResult, setTryResult] = useState<string | null>(null);
  const [tryError, setTryError] = useState("");
  const [tryModalOpen, setTryModalOpen] = useState(false);
  const [refSet, setRefSet] = useState(false);
  const tryOnEnabled = process.env.NEXT_PUBLIC_TRYON === "1";

  useEffect(() => {
    if (!tryOnEnabled) return;
    fetch("/api/reference").then((r) => r.json()).then((d) => setRefSet(!!d.set)).catch(() => {});
  }, [tryOnEnabled]);

  async function tryItOn() {
    if (!base64 || !preview) return;
    setTryBusy(true);
    setTryError("");
    setTryResult(null);
    try {
      const blob = await (await fetch(preview)).blob();
      const fd = new FormData();
      fd.append("file", new File([blob], "garment.jpg", { type: "image/jpeg" }));
      const [up, ex] = await Promise.all([
        fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json()).catch(() => ({})),
        fetch("/api/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageBase64: base64, mediaType }) }).then((r) => r.json()).catch(() => ({}))
      ]);
      const cat = tryOnCategory(ex.item?.category ?? null);
      if (!cat) { setTryError("Try-on works on clothing — not bags, shoes or jewellery."); setTryBusy(false); return; }
      if (!up.url) { setTryError("Couldn't prepare the image."); setTryBusy(false); return; }
      const res = await fetch("/api/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ garmentImage: up.url, category: cat })
      });
      const d = await res.json().catch(() => ({}));
      setTryBusy(false);
      if (d.url) { setTryResult(d.url); setTryModalOpen(true); }
      else setTryError(d.error || "Try-on failed");
    } catch {
      setTryBusy(false);
      setTryError("Try-on failed");
    }
  }

  async function addToWishlist() {
    if (!preview || !base64 || !result) return;
    setAdding(true);
    setError("");
    try {
      const blob = await (await fetch(preview)).blob();
      const fd = new FormData();
      fd.append("file", new File([blob], "piece.jpg", { type: "image/jpeg" }));
      const [up, ex] = await Promise.all([
        fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json()).catch(() => ({})),
        fetch("/api/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageBase64: base64, mediaType }) }).then((r) => r.json()).catch(() => ({}))
      ]);
      const it = ex.item || {};
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: it.name || result.itemGuess,
          category: it.category, colours: it.colours, designer: it.designer,
          fabric: it.fabric, occasion: it.occasion, notes: it.notes,
          status: "Wishlist", photo: up.url
        })
      });
      setAdding(false);
      if (res.ok) setAdded(true);
      else { const d = await res.json().catch(() => ({})); setError(d.error || "Couldn't add"); }
    } catch {
      setAdding(false);
      setError("Couldn't add to wishlist");
    }
  }

  async function saveToAssessed() {
    if (!preview || !result || savingA) return;
    setSavingA(true);
    setError("");
    try {
      // Persist the photo to Blob first (mirrors the wishlist save), then record the verdict.
      const blob = await (await fetch(preview)).blob();
      const fd = new FormData();
      fd.append("file", new File([blob], "assessed.jpg", { type: "image/jpeg" }));
      const up = await fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json()).catch(() => ({}));
      const reason = [result.colourFit, result.bodyFit, result.notes].filter(Boolean).join(" ");
      const res = await fetch("/api/assessed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: result.itemGuess,
          photo: up.url,
          verdict: result.verdict,
          reason,
          score: result.confidence,
          occasion: note || undefined
        })
      });
      setSavingA(false);
      if (res.ok) setSavedA(true);
      else { const d = await res.json().catch(() => ({})); setError(d.error || "Couldn't save"); }
    } catch {
      setSavingA(false);
      setError("Couldn't save the assessment");
    }
  }

  function onFile(file: File) {
    setError("");
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        // Claude accepts only jpeg/png/gif/webp — re-encode anything (AVIF, HEIC-as-rendered, etc.) to JPEG.
        const maxDim = 1600;
        let { width, height } = img;
        if (Math.max(width, height) > maxDim) {
          const s = maxDim / Math.max(width, height);
          width = Math.round(width * s);
          height = Math.round(height * s);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setPreview(dataUrl);
          setBase64(dataUrl.split(",")[1]);
          setMediaType(file.type || "image/jpeg");
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const jpeg = canvas.toDataURL("image/jpeg", 0.9);
        setPreview(jpeg);
        setBase64(jpeg.split(",")[1]);
        setMediaType("image/jpeg");
        setPalette(extractPaletteFromImage(img));
      };
      img.onerror = () => setError("Couldn't read that image — try a JPG, PNG or screenshot.");
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  async function run() {
    if (!base64) return;
    setBusy(true);
    setError("");
    setResult(null);
    setTryResult(null);
    setTryError("");
    const res = await fetch("/api/assess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: base64, mediaType, note })
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setResult(data.assessment);
      // auto-run try-on once the verdict lands (if her photo's set)
      if (tryOnEnabled && refSet) tryItOn();
    } else setError(data.error || "Assessment failed");
  }

  return (
    <Shell>
      <div className="text-center mb-12">
        <p className="eyebrow mb-3">The Verdict</p>
        <h1 className="font-display text-5xl tracking-tight">Should you buy it?</h1>
        <p className="mt-4 text-sm text-graphite max-w-md mx-auto leading-relaxed">
          A photo of anything you&rsquo;re considering, read against your colouring, your body, and the
          pieces already in your closet.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-12 items-start">
        <div>
          <label className="block aspect-[3/4] bg-paper overflow-hidden cursor-pointer flex items-center justify-center border border-line">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="To assess" className="h-full w-full object-cover" />
            ) : (
              <span className="eyebrow">Tap to add a photo</span>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="OPTIONAL — WHERE YOU'D WEAR IT"
            className="underline-input mt-5 text-[11px] tracking-wide2 uppercase placeholder:text-graphite"
          />
          <button onClick={run} disabled={!base64 || busy} className="btn-solid w-full mt-6">
            {busy ? "Reading…" : "Assess the fit"}
          </button>
          {error && <p className="text-sale text-xs mt-4 uppercase tracking-wide2">{error}</p>}
        </div>

        <div>
          {!result && !busy && (
            <div className="border-t border-line pt-6">
              <p className="eyebrow mb-3">Awaiting a piece</p>
              <p className="text-sm text-graphite leading-relaxed">
                The verdict appears here: a clear call, how the colour reads on you, how the cut
                suits your body, and what you already own that pairs with it.
              </p>
            </div>
          )}
          {busy && <p className="eyebrow">Considering the fit…</p>}
          {result && preview && (
            <>
              <AssessReveal imageUrl={preview} assessment={result} palette={palette} />
              <div className="max-w-md mx-auto mt-6">
                {added ? (
                  <p className="eyebrow text-center">Added to your wishlist.</p>
                ) : (
                  <button
                    onClick={addToWishlist}
                    disabled={adding}
                    className="w-full border border-ink text-ink text-[11px] uppercase tracking-wide2 py-3 hover:bg-ink hover:text-paper transition-colors"
                  >
                    {adding ? "Adding…" : "Add to your wishlist"}
                  </button>
                )}
              </div>
              <div className="max-w-md mx-auto mt-3">
                {savedA ? (
                  <p className="eyebrow text-center">
                    Saved to your verdicts.{" "}
                    <Link href="/saved" className="underline hover:text-ink">View in Assessed</Link>
                  </p>
                ) : (
                  <button
                    onClick={saveToAssessed}
                    disabled={savingA}
                    className="w-full text-[11px] uppercase tracking-wide2 py-3 text-graphite hover:text-ink transition-colors"
                  >
                    {savingA ? "Saving…" : "Save to Assessed"}
                  </button>
                )}
              </div>
              {tryOnEnabled && (
                <div className="max-w-md mx-auto mt-5">
                  {!refSet ? (
                    <p className="eyebrow text-center">Set your photo on any closet item to see it on you here.</p>
                  ) : tryBusy ? (
                    <p className="eyebrow text-center">Seeing it on you… (~15s)</p>
                  ) : tryResult ? (
                    <button
                      onClick={() => setTryModalOpen(true)}
                      className="w-full border border-ink text-ink text-[11px] uppercase tracking-wide2 py-3 hover:bg-ink hover:text-paper transition-colors"
                    >
                      See it on you
                    </button>
                  ) : (
                    <button
                      onClick={tryItOn}
                      className="w-full border border-ink text-ink text-[11px] uppercase tracking-wide2 py-3 hover:bg-ink hover:text-paper transition-colors"
                    >
                      See it on you
                    </button>
                  )}
                  {tryError && <p className="text-sale text-xs mt-3 uppercase tracking-wide2">{tryError}</p>}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Modal open={tryModalOpen} onClose={() => setTryModalOpen(false)} title="On you">
        {tryResult && (
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tryResult} alt="you wearing it" className="w-full rounded-md" />
            <button onClick={tryItOn} className="eyebrow mt-4 hover:text-ink block mx-auto">Try again</button>
          </div>
        )}
      </Modal>
    </Shell>
  );
}
