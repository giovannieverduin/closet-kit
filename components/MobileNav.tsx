"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS, PRIMARY_TABS, isActiveHref } from "@/lib/nav";

// Phone-only navigation: a fixed bottom tab bar for the four primary destinations so the
// app is usable one-handed, plus a "More" sheet that exposes the full grouped nav (the
// desktop header is hidden below `sm`). Hidden entirely from `sm` up.
export default function MobileNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the sheet whenever the route changes (tapping a link navigates).
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock background scroll while the full-screen sheet is open.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [menuOpen]);

  return (
    <>
      {/* Full-menu sheet — every destination, opened from "More". */}
      {menuOpen && (
        <div className="sm:hidden fixed inset-0 z-50 bg-paper flex flex-col" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="flex items-center justify-between px-6 py-5 border-b border-line">
            <span className="font-display text-lg tracking-[0.32em] uppercase">The Wardrobe</span>
            <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="text-3xl leading-none text-graphite -mr-1 px-2">
              ×
            </button>
          </div>
          <nav aria-label="All sections" className="flex-1 overflow-y-auto px-8 py-9 space-y-9">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-[9px] tracking-luxe uppercase text-graphite mb-3">{group.label}</p>
                <ul className="space-y-3">
                  {group.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        onClick={() => setMenuOpen(false)}
                        aria-current={isActiveHref(pathname, l.href) ? "page" : undefined}
                        className={`font-display text-2xl transition-colors ${isActiveHref(pathname, l.href) ? "text-ink" : "text-graphite"}`}
                      >
                        {l.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      )}

      {/* Fixed bottom tab bar — primary destinations + More. */}
      <nav
        aria-label="Primary"
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80 pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="flex">
          {PRIMARY_TABS.map((t) => {
            const active = isActiveHref(pathname, t.href);
            return (
              <li key={t.href} className="flex-1">
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={`block text-center py-3 text-[10px] tracking-luxe uppercase transition-colors ${active ? "text-ink" : "text-graphite hover:text-ink"}`}
                >
                  {t.name}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              onClick={() => setMenuOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              className="w-full text-center py-3 text-[10px] tracking-luxe uppercase text-graphite hover:text-ink transition-colors"
            >
              More
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
