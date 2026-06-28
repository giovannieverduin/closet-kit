"use client";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow block mb-3">{label}</span>
      {children}
    </label>
  );
}

export function ChipGroup({ label, options, selected, onToggle }:
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
