"use client";
import { useEffect } from "react";
import type { Assessment } from "@/lib/anthropic";
import { useRevealSequence } from "@/hooks/useRevealSequence";

const VERDICT_DOT: Record<string, string> = {
  "Strong yes": "#5b7a52", "Worth it": "#7d9be0", "Only if": "#d4af5c", "Skip": "#b13160"
};

export function AssessReveal({ imageUrl, assessment, palette = [] }:
  { imageUrl: string; assessment: Assessment; palette?: string[] }) {
  const { phase, start } = useRevealSequence();
  // run the reveal once when this result mounts
  useEffect(() => { start(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <div className="mx-auto max-w-md">
      <div className="relative overflow-hidden rounded-md border border-stone-200 bg-stone-100" style={{ height: 320 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="assessed piece" className="h-full w-full object-contain" />
        {phase === "scanning" && (
          <div className="absolute inset-x-0" style={{ height: "40%", top: "-40%", animation: "ar-beam 2.2s ease-in-out", background: "linear-gradient(180deg,transparent,rgba(255,255,255,.7),transparent)" }} />
        )}
      </div>

      {phase === "revealed" && (
        <div className="mt-4" style={{ animation: "ar-reveal .5s ease both" }}>
          <div className="flex items-baseline justify-between">
            <div style={{ fontFamily: "'Bodoni 72','Didot',Georgia,serif", fontSize: 30 }}>
              <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 9, marginRight: 9, background: VERDICT_DOT[assessment.verdict] ?? "#1c1a17" }} />
              {assessment.verdict}
            </div>
            <div className="text-xs tracking-widest text-stone-400">{assessment.confidence}%</div>
          </div>
          <div className="my-3 h-px bg-stone-200">
            <div className="h-full bg-stone-900" style={{ width: `${assessment.confidence}%`, transition: "width 1s ease" }} />
          </div>
          <Row k="COLOUR" swatches={palette}>{assessment.colourFit}</Row>
          <Row k="CUT">{assessment.bodyFit}</Row>
          <Row k="PAIRS WITH">
            <div className="flex flex-wrap gap-1.5">
              {assessment.pairsWith.map((p) => (
                <span key={p} className="rounded-full border border-stone-300 px-2.5 py-0.5 text-[11px] text-stone-700">{p}</span>
              ))}
            </div>
          </Row>
          {assessment.duplicateOf
            ? <Row k="HEADS-UP">Overlaps with your <b>{assessment.duplicateOf}</b>.</Row>
            : <Row k="HEADS-UP">No real overlap with what you own.</Row>}
          {assessment.notes && <Row k="NOTES">{assessment.notes}</Row>}
        </div>
      )}
      <style>{`
        @keyframes ar-beam { 0%{top:-40%} 100%{top:100%} }
        @keyframes ar-reveal { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
      `}</style>
    </div>
  );
}

function Row({ k, children, swatches }: { k: string; children: React.ReactNode; swatches?: string[] }) {
  return (
    <div className="grid grid-cols-[78px_1fr] gap-3 border-t border-stone-100 py-2.5">
      <div className="pt-0.5 text-[9px] tracking-[0.2em] text-stone-400">{k}</div>
      <div className="text-[12.5px] leading-relaxed text-stone-700">
        {swatches && swatches.length > 0 && (
          <span className="mr-2 inline-flex gap-1 align-middle">
            {swatches.slice(0, 4).map((h, i) => <span key={i} style={{ width: 12, height: 12, borderRadius: 3, background: h, display: "inline-block" }} />)}
          </span>
        )}
        {children}
      </div>
    </div>
  );
}
