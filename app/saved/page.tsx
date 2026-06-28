"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";

type Assessed = {
  id: string;
  look: string;
  photo: string | null;
  verdict: string | null;
  reason: string;
  score: number | null;
  occasion: string;
  link: string | null;
  date: string | null;
};

const VERDICT_DOT: Record<string, string> = {
  "Strong yes": "#5b7a52",
  "Only if": "#d4af5c",
  "Avoid": "#b13160"
};
const FILTERS = ["All", "Strong yes", "Only if", "Avoid"] as const;

export default function Saved() {
  const [assessed, setAssessed] = useState<Assessed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [verdict, setVerdict] = useState<(typeof FILTERS)[number]>("All");

  useEffect(() => {
    fetch("/api/assessed")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setAssessed(d.assessed || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const shown = useMemo(
    () => (verdict === "All" ? assessed : assessed.filter((a) => a.verdict === verdict)),
    [assessed, verdict]
  );

  return (
    <Shell>
      <div className="text-center mb-8">
        <p className="eyebrow mb-3">Saved</p>
        <h1 className="font-display text-5xl tracking-tight">Your Saved Edit</h1>
      </div>

      {/* Sub-tabs: Assessed lives here; Diary + Wishlist are their own pages. */}
      <div className="flex justify-center gap-x-8 mb-10 text-[11px] uppercase tracking-wide2">
        <span className="text-ink border-b border-ink pb-1">Assessed</span>
        <Link href="/looks" className="text-graphite hover:text-ink pb-1">Diary</Link>
        <Link href="/wishlist" className="text-graphite hover:text-ink pb-1">Wishlist</Link>
      </div>

      <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-10 text-[11px] uppercase tracking-wide2 border-b border-line pb-6">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setVerdict(f)}
            className={verdict === f ? "text-ink border-b border-ink pb-0.5" : "text-graphite hover:text-ink pb-0.5"}
          >
            {f}
          </button>
        ))}
      </div>

      {loading && <p className="text-center eyebrow">Loading your verdicts…</p>}
      {error && (
        <div className="max-w-md mx-auto text-center py-10">
          <p className="eyebrow mb-2">Saved unavailable</p>
          <p className="text-sm text-graphite">{error}. Check that the Assessed Looks database is shared with the integration.</p>
        </div>
      )}

      {!loading && !error && shown.length === 0 && (
        <div className="max-w-md mx-auto text-center py-16">
          <p className="font-display text-2xl mb-3">Nothing saved yet</p>
          <p className="text-sm text-graphite leading-relaxed mb-6">
            Every time you assess a piece, save the verdict here — your second opinion, kept.
          </p>
          <Link href="/assess" className="btn-solid inline-block">Assess a piece</Link>
        </div>
      )}

      {!loading && !error && shown.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
          {shown.map((a) => (
            <div key={a.id} className="group block">
              <div className="aspect-[3/4] bg-paper overflow-hidden border border-line">
                {a.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.photo} alt={a.look} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center eyebrow text-graphite">No photo</div>
                )}
              </div>
              <div className="mt-4 text-center px-2">
                <p className="text-sm font-display tracking-tight">
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: 8,
                      marginRight: 6,
                      background: VERDICT_DOT[a.verdict ?? ""] ?? "#1c1a17"
                    }}
                  />
                  {a.verdict ?? "Assessed"}
                  {typeof a.score === "number" && (
                    <span className="text-[10px] tracking-luxe text-graphite"> · {a.score}%</span>
                  )}
                </p>
                {a.reason && <p className="mt-2 text-[12px] text-graphite leading-snug line-clamp-3">{a.reason}</p>}
                {a.occasion && (
                  <p className="mt-2 text-[10px] uppercase tracking-luxe text-graphite">{a.occasion}</p>
                )}
                {a.link && (
                  <a
                    href={a.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-[10px] uppercase tracking-wide2 text-graphite hover:text-ink"
                  >
                    Shop it
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
