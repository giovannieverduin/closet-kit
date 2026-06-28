import Link from "next/link";
import { ANALYSIS, COLOR_GROUPS, METALS, PATTERNS } from "@/lib/profile";

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
  return (
    <div className="max-w-md mx-auto">
      {/* Analysis header */}
      <div className="text-center">
        <p className="eyebrow mb-2">Personal colour analysis</p>
        <h1 className="font-display text-5xl tracking-tight">{ANALYSIS.season}</h1>
        <p className="text-[11px] uppercase tracking-[0.18em] text-gold mt-2">Warm · Clear · Light</p>
        <p className="eyebrow mt-2">{ANALYSIS.source}</p>
      </div>

      {/* Analysis card */}
      <div className="border border-line p-5 mt-8 text-sm">
        {ANALYSIS.axes.map((a) => (
          <div key={a.dim} className="flex justify-between py-1.5">
            <span className="text-graphite">{a.dim}</span>
            <span>{a.value}</span>
          </div>
        ))}
        <div className="border-t border-line mt-3 pt-3">
          <p className="eyebrow mb-1.5">Features</p>
          <p className="text-xs text-graphite">{ANALYSIS.features.join(" · ")}</p>
        </div>
      </div>

      {/* Colour groups */}
      <div className="mt-10 space-y-9">
        {COLOR_GROUPS.map((g) => (
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
          <Swatches swatches={METALS} />
        </section>

        {/* Patterns */}
        <section>
          <p className="navlink border-b border-line pb-2 mb-5 block">Patterns that suit you</p>
          <ul className="space-y-4">
            {PATTERNS.map((p) => (
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
        {ANALYSIS.tagline}
      </div>

      <div className="text-center mt-10 border-t border-line pt-8">
        <Link href="/salon" className="navlink hover:text-graphite transition-colors">
          Try a new look →
        </Link>
      </div>
    </div>
  );
}
