"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DEFAULT_ASSESSMENT, type ColorAssessment } from "@/lib/profile";
import { fileToJpeg } from "@/lib/imageClient";
import { Modal } from "@/components/Modal";
import { ANALYSIS_OPTIONS } from "@/lib/colorAnalysisOptions";

function Swatches({ swatches, avoid }: { swatches: { name: string; hex: string; note?: string }[]; avoid?: boolean }) {
  return (
    <div className="grid grid-cols-3 min-[430px]:grid-cols-6 gap-x-4 gap-y-5">
      {swatches.map((s) => (
        <div key={s.name}>
          <span
            className="block aspect-square border"
            style={{ background: s.hex, borderColor: avoid ? "rgba(138,28,28,0.3)" : "#E7E5E2" }}
          />
          <span className="block text-[10px] uppercase tracking-wide2 mt-1.5 leading-tight">{s.name}</span>
          {s.note && <span className="block text-[10px] text-graphite mt-0.5 leading-snug">{s.note}</span>}
        </div>
      ))}
    </div>
  );
}

export default function PaletteView() {
  const [a, setA] = useState<ColorAssessment>(DEFAULT_ASSESSMENT);
  const [custom, setCustom] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Load the active assessment (uploaded one, or the example default).
  useEffect(() => {
    let alive = true;
    fetch("/api/assessment")
      .then((r) => r.json())
      .then((j) => {
        if (alive && j?.assessment) {
          setA(j.assessment);
          setCustom(Boolean(j.custom));
        }
      })
      .catch(() => {/* keep default */});
    return () => {
      alive = false;
    };
  }, []);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const { base64 } = await fileToJpeg(file);
      const res = await fetch("/api/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType: "image/jpeg" })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Upload failed");
      setA(j.assessment);
      setCustom(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function onReset() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/assessment", { method: "DELETE" });
      const j = await res.json();
      setA(j.assessment || DEFAULT_ASSESSMENT);
      setCustom(false);
    } catch {
      setError("Couldn't reset");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Analysis header */}
      <div className="text-center">
        <p className="eyebrow mb-2">Personal colour analysis</p>
        <h1 className="font-display text-5xl tracking-tight">{a.season}</h1>
        <p className="text-[11px] uppercase tracking-[0.18em] text-gold mt-2">{a.toneLine}</p>
        <p className="eyebrow mt-2">{a.source}</p>
      </div>

      {/* Upload your own colour analysis */}
      <div className="mt-6 flex flex-col items-center gap-2">
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onUpload} />
        <div className="flex items-center gap-4">
          <button
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            className="navlink hover:text-graphite transition-colors disabled:opacity-40"
          >
            {busy ? "Reading…" : custom ? "Replace your analysis" : "Upload your colour analysis"}
          </button>
          {custom && !busy && (
            <button onClick={onReset} className="navlink text-graphite hover:text-ink transition-colors">
              Reset to example
            </button>
          )}
        </div>
        <p className="text-[10px] text-graphite text-center max-w-xs">
          Upload a photo of your colour-analysis result, a draping swatch fan, or a clear, well-lit selfie.
        </p>
        <button
          onClick={() => setShowHelp(true)}
          className="navlink text-gold hover:text-graphite transition-colors"
        >
          Where do I get a colour analysis? →
        </button>
        {error && <p className="text-[11px] text-sale">{error}</p>}
      </div>

      {/* Analysis card */}
      <div className="border border-line p-5 mt-8 text-sm">
        {a.axes.map((ax) => (
          <div key={ax.dim} className="flex justify-between py-1.5">
            <span className="text-graphite">{ax.dim}</span>
            <span>{ax.value}</span>
          </div>
        ))}
        <div className="border-t border-line mt-3 pt-3">
          <p className="eyebrow mb-1.5">Features</p>
          <p className="text-xs text-graphite">{a.features.join(" · ")}</p>
        </div>
      </div>

      {/* Colour groups */}
      <div className="mt-10 space-y-9">
        {a.colorGroups.map((g) => (
          <section key={g.key}>
            <p className={`navlink border-b pb-2 mb-5 block ${g.tone === "avoid" ? "text-sale border-sale/30" : "border-line"}`}>
              {g.label}
            </p>
            <Swatches swatches={g.swatches} avoid={g.tone === "avoid"} />
          </section>
        ))}

        {/* Metals & accessories */}
        <section>
          <p className="navlink border-b border-line pb-2 mb-5 block">Best metals &amp; accessories</p>
          <Swatches swatches={a.metals} />
        </section>

        {/* Patterns */}
        <section>
          <p className="navlink border-b border-line pb-2 mb-5 block">Patterns that suit you</p>
          <ul className="space-y-4">
            {a.patterns.map((p) => (
              <li key={p.name} className="flex gap-3">
                <span className="text-[8px] mt-1.5 leading-none text-gold">●</span>
                <span>
                  <span className="text-sm">{p.name}</span>
                  <span className="block text-xs text-graphite mt-0.5 leading-snug">{p.note}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Tagline */}
      <div className="border border-gold/40 bg-gold/5 p-4 mt-10 text-center text-sm text-graphite">
        {a.tagline}
      </div>

      <div className="text-center mt-10 border-t border-line pt-8">
        <Link href="/salon" className="navlink hover:text-graphite transition-colors">
          Try a new look →
        </Link>
      </div>

      <Modal open={showHelp} onClose={() => setShowHelp(false)} title="Where to get your colour analysis" size="lg">
        <p className="text-sm text-graphite mb-5">
          A few ways to get your colours, anywhere in the world — from most rigorous to quickest. These are
          well-known starting points, not endorsements.
        </p>
        <div className="space-y-5">
          {ANALYSIS_OPTIONS.map((o) => (
            <div key={o.name} className="border-b border-line pb-5 last:border-0 last:pb-0">
              <p className="text-sm font-medium">{o.name}</p>
              <p className="text-[11px] uppercase tracking-wide2 text-gold mt-1">{o.note}</p>
              <p className="text-xs text-graphite mt-2 leading-relaxed">{o.blurb}</p>
              {o.links && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
                  {o.links.map((l) => (
                    <a
                      key={l.href}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="navlink text-ink hover:text-graphite transition-colors"
                    >
                      {l.label} →
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
