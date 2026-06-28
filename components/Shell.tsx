import Link from "next/link";
import MobileNav from "@/components/MobileNav";
import { NAV_GROUPS } from "@/lib/nav";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="border-b border-line">
        <p className="text-center py-2 text-[10px] tracking-luxe uppercase text-graphite">
          Your Wardrobe — Private Edit
        </p>
      </div>
      <header className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-7 text-center">
          <Link href="/" className="font-display text-2xl tracking-[0.32em] uppercase">
            The Wardrobe
          </Link>
          <nav className="mt-6 hidden sm:flex flex-wrap items-start justify-center">
            {NAV_GROUPS.map((group, i) => (
              <div
                key={group.label}
                className={`flex flex-col items-center gap-2 px-6 py-2 ${i > 0 ? "sm:border-l sm:border-line" : ""}`}
              >
                <span className="text-[9px] tracking-luxe uppercase text-graphite">{group.label}</span>
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                  {group.links.map((l) => (
                    <Link key={l.href} href={l.href} className="navlink hover:text-graphite transition-colors">
                      {l.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12 pb-28 sm:pb-12">{children}</main>
      <MobileNav />
      <footer className="border-t border-line mt-16 pb-16 sm:pb-0">
        <p className="text-center py-8 text-[10px] tracking-luxe uppercase text-graphite">
          Private styling companion · Built with Claude · Synced with Notion
        </p>
      </footer>
    </div>
  );
}
