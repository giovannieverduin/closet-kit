"use client";

import Shell from "@/components/Shell";
import { TryOn } from "@/components/TryOn";
import { DISCOVER_LOOKS } from "@/lib/discoverLooks";

export default function Discover() {
  return (
    <Shell>
      <div className="text-center mb-12">
        <p className="eyebrow mb-3">For you</p>
        <h1 className="font-display text-5xl tracking-tight">Discover</h1>
        <p className="mt-4 text-sm text-graphite max-w-md mx-auto leading-relaxed">
          Looks by mood, chosen for your colouring and shape — and shown on you. Tap to see each on your body, then shop the pieces.
        </p>
      </div>

      <div className="space-y-20">
        {DISCOVER_LOOKS.map((look) => (
          <section key={look.archetype} className="grid md:grid-cols-2 gap-10 items-start border-t border-line pt-10">
            <div>
              <div className="aspect-[3/4] bg-paper overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={look.hero.image} alt={look.hero.name} loading="lazy" className="h-full w-full object-cover" />
              </div>
            </div>

            <div>
              <p className="eyebrow mb-2">{look.archetype}</p>
              <h2 className="font-display text-4xl tracking-tight mb-4">{look.title}</h2>
              <p className="text-sm text-graphite leading-relaxed mb-6">{look.rationale}</p>

              <TryOn
                garmentUrl={look.hero.image ?? null}
                category={look.hero.category ?? null}
                product={{
                  brand: look.hero.brand,
                  name: look.hero.name,
                  price: look.hero.price,
                  link: look.hero.link,
                  category: look.hero.category,
                  productImage: look.hero.image,
                  archetype: look.archetype,
                  accessories: look.accessories.map((a) => ({ brand: a.brand, name: a.name, price: a.price, link: a.link }))
                }}
              />

              <div className="mt-8 border-t border-line pt-5">
                <p className="eyebrow mb-4">Shop the look</p>

                <a href={look.hero.link} target="_blank" rel="noopener noreferrer" className="block group mb-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-ink group-hover:text-graphite">{look.hero.brand} — {look.hero.name} ↗</span>
                    {look.hero.price && <span className="text-sm text-graphite whitespace-nowrap">{look.hero.price}</span>}
                  </div>
                  {look.hero.description && <p className="text-xs text-graphite mt-1 leading-relaxed">{look.hero.description}</p>}
                </a>

                {look.accessories.map((a) => (
                  <a key={a.name} href={a.link} target="_blank" rel="noopener noreferrer" className="block group mb-2.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm text-graphite group-hover:text-ink">{a.brand ? `${a.brand} — ` : ""}{a.name} ↗</span>
                      {a.price && <span className="text-xs text-graphite whitespace-nowrap">{a.price}</span>}
                    </div>
                    {a.description && <p className="text-xs text-graphite mt-0.5 leading-relaxed">{a.description}</p>}
                  </a>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </Shell>
  );
}
