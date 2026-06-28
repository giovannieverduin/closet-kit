"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Portal-based modal: renders to document.body, dims the backdrop, locks scroll,
// closes on Escape or backdrop click. Matches the app's paper/ink palette.
export function Modal({ open, onClose, title, children, size = "md" }:
  { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; size?: "md" | "lg" | "xl" }) {
  const [mounted, setMounted] = useState(false);
  const widthCls = size === "xl" ? "max-w-4xl" : size === "lg" ? "max-w-2xl" : "max-w-md";

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/60" onClick={onClose} />
      <div className={`relative bg-paper w-full ${widthCls} max-h-[90vh] overflow-auto p-6 rounded-md shadow-2xl`}>
        <div className="flex items-center justify-between mb-4">
          {title ? <p className="eyebrow">{title}</p> : <span />}
          <button onClick={onClose} aria-label="Close" className="text-graphite hover:text-ink text-2xl leading-none -mt-1">×</button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
