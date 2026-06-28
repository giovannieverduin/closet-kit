"use client";

import { useEffect, useMemo, useState } from "react";
import { eventsNearTime } from "@/lib/calendarMatch";

type Look = {
  id: string;
  occasion: string;
  wornWith: string;
  date: string | null;
  photo: string | null;
  tags: string[];
  rating: number | null;
  pieceIds: string[];
  notes: string;
};
type Item = { id: string; name: string };
type CalEvent = { title: string; start: string; end: string | null; allDay: boolean; attendees: string[]; suggestedTag: string | null };

const SEED_TAGS = ["date night", "work", "event", "casual", "wedding guest", "resort", "travel", "winner"];

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

// Read the selfie's capture time from its EXIF (DateTimeOriginal). Returns an ISO instant,
// or null for screenshots / images with the metadata stripped. exifr is loaded lazily so it
// only ships when a photo is actually added.
async function readCaptureTime(file: File): Promise<string | null> {
  try {
    const exifr = (await import("exifr")).default;
    const meta = await exifr.parse(file, ["DateTimeOriginal", "CreateDate"]);
    const d: Date | undefined = meta?.DateTimeOriginal || meta?.CreateDate;
    return d instanceof Date && !isNaN(d.getTime()) ? d.toISOString() : null;
  } catch {
    return null;
  }
}

// Local YYYY-MM-DD for a <input type="date"> value (en-CA renders the local date ISO-style).
function localDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA");
}

function Hearts({ value, onChange, size = "text-lg" }: { value: number; onChange?: (n: number) => void; size?: string }) {
  return (
    <span className={`inline-flex gap-1 ${size}`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const heart = (
          <span className={filled ? "text-ink" : "text-line"} aria-hidden>
            {filled ? "♥" : "♡"}
          </span>
        );
        if (!onChange) return <span key={n}>{heart}</span>;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? 0 : n)}
            className="leading-none hover:scale-110 transition-transform"
            aria-label={`${n} ${n === 1 ? "heart" : "hearts"}`}
          >
            {heart}
          </button>
        );
      })}
    </span>
  );
}

export function WearLog() {
  const [looks, setLooks] = useState<Look[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  // log form
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [occasion, setOccasion] = useState("");
  const [wornWith, setWornWith] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [rating, setRating] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [pieceFilter, setPieceFilter] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // calendar suggestions for the chosen date
  const [calEvents, setCalEvents] = useState<CalEvent[]>([]);
  // selfie capture time (EXIF) + which event was auto-tagged from it
  const [capturedAt, setCapturedAt] = useState<string | null>(null);
  const [autoTagged, setAutoTagged] = useState<string | null>(null);
  const [autoAppliedFor, setAutoAppliedFor] = useState<string | null>(null);

  // diary filters
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [winnersOnly, setWinnersOnly] = useState(false);
  const [search, setSearch] = useState("");

  function load() {
    fetch("/api/looks").then((r) => r.json()).then((d) => { if (!d.error) setLooks(d.looks); }).catch(() => {});
  }
  useEffect(() => {
    load();
    fetch("/api/wardrobe").then((r) => r.json()).then((d) => {
      if (!d.error) setItems(d.items.map((i: any) => ({ id: i.id, name: i.name })));
    }).catch(() => {});
  }, []);

  // Pull that day's calendar events (if a secret iCal feed is configured) for tap-to-fill.
  useEffect(() => {
    if (!date) { setCalEvents([]); return; }
    const tz = new Date().getTimezoneOffset();
    fetch(`/api/calendar?date=${date}&tz=${tz}`)
      .then((r) => r.json())
      .then((d) => setCalEvents(Array.isArray(d.events) ? d.events : []))
      .catch(() => setCalEvents([]));
  }, [date]);

  // Events within ~1h of when the selfie was taken — the likely occasion(s).
  const timeMatches = useMemo(
    () => (capturedAt ? eventsNearTime(calEvents, capturedAt) : []),
    [calEvents, capturedAt]
  );

  // Exactly one event around the photo's time → tag it automatically (once, and only if the
  // user hasn't already named an occasion). Multiple matches are offered as choices instead.
  useEffect(() => {
    if (!capturedAt || autoAppliedFor === capturedAt) return;
    if (timeMatches.length === 1 && !occasion) {
      applyEvent(timeMatches[0]);
      setAutoTagged(timeMatches[0].title);
      setAutoAppliedFor(capturedAt);
    }
  }, [timeMatches, capturedAt, autoAppliedFor, occasion]);

  async function onPhoto(file: File) {
    setUploading(true);
    setError("");
    // Pull the capture time from the selfie's EXIF; set the date from it and let the
    // calendar matcher tag the corresponding event.
    setAutoTagged(null);
    const captured = await readCaptureTime(file);
    setCapturedAt(captured);
    if (captured) setDate(localDay(captured));
    const fd = new FormData();
    fd.append("file", file);
    // Same Blob upload path as Add — and deliberately NO background removal: keep the full-fit selfie as-is.
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const d = await res.json().catch(() => ({}));
    setUploading(false);
    if (res.ok) setPhoto(d.url);
    else setError(d.error || "Upload failed");
  }

  function addTag(raw: string) {
    const t = raw.trim().toLowerCase();
    if (!t) return;
    setTags((prev) => (prev.includes(t) ? prev : [...prev, t]));
    setTagDraft("");
  }
  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t));
  }
  function togglePiece(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  // Tap a calendar event to prefill the look (all fields stay editable).
  function applyEvent(ev: CalEvent) {
    setOccasion(ev.title);
    if (ev.suggestedTag) {
      const tag = ev.suggestedTag;
      setTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
    }
    if (ev.attendees.length && !wornWith) setWornWith(ev.attendees.join(", "));
  }

  async function save() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/looks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo, date, occasion, wornWith, tags, rating: rating || undefined, pieceIds: picked, notes })
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setPhoto(null);
      setOccasion("");
      setWornWith("");
      setTags([]);
      setTagDraft("");
      setRating(0);
      setPicked([]);
      setNotes("");
      setCapturedAt(null);
      setAutoTagged(null);
      setAutoAppliedFor(null);
      load();
    } else setError(d.error || "Couldn't save");
  }

  const nameById = (id: string) => items.find((i) => i.id === id)?.name || "piece";
  const shownPieces = items.filter((i) => !pieceFilter || i.name.toLowerCase().includes(pieceFilter.toLowerCase()));
  const tagSuggestions = useMemo(() => {
    const seen = new Set([...SEED_TAGS, ...looks.flatMap((l) => l.tags)]);
    return Array.from(seen).filter((t) => !tags.includes(t));
  }, [looks, tags]);

  const allTags = useMemo(() => Array.from(new Set(looks.flatMap((l) => l.tags))).sort(), [looks]);
  // Day events minus the ones already surfaced as time matches (when we have a capture time).
  const otherEvents = capturedAt ? calEvents.filter((e) => !timeMatches.includes(e)) : calEvents;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return looks.filter((l) => {
      if (tagFilter && !l.tags.includes(tagFilter)) return false;
      if (winnersOnly && !(l.rating && l.rating >= 4)) return false;
      if (q) {
        const hay = [l.occasion, l.wornWith, l.notes, ...l.tags].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [looks, tagFilter, winnersOnly, search]);

  return (
    <div className="space-y-14">
      {/* Log a look */}
      <div className="max-w-md mx-auto space-y-7">
        <label className="block aspect-[3/4] max-w-[180px] mx-auto bg-paper overflow-hidden cursor-pointer flex items-center justify-center border border-line">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="look" className="h-full w-full object-cover" />
          ) : (
            <span className="eyebrow">{uploading ? "Uploading…" : "Add a photo"}</span>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} />
        </label>

        <div className="text-center">
          <span className="eyebrow block mb-3">Rating</span>
          <Hearts value={rating} onChange={setRating} size="text-2xl" />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <label className="block">
            <span className="eyebrow block mb-3">Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="underline-input" />
            {capturedAt && (
              <span className="block mt-1 text-[10px] text-graphite normal-case tracking-normal">from photo · {fmtTime(capturedAt)}</span>
            )}
          </label>
          <label className="block">
            <span className="eyebrow block mb-3">Occasion</span>
            <input value={occasion} onChange={(e) => setOccasion(e.target.value)} placeholder="e.g. Sara's wedding" className="underline-input" />
          </label>
        </div>

        {/* One event near the photo's time: tagged automatically. */}
        {capturedAt && autoTagged && timeMatches.length === 1 && (
          <div>
            <span className="eyebrow block mb-2">Tagged from your photo</span>
            <button
              type="button"
              onClick={() => applyEvent(timeMatches[0])}
              title={timeMatches[0].attendees.length ? `with ${timeMatches[0].attendees.join(", ")}` : undefined}
              className={`rounded-full px-3 py-1 text-[11px] border transition-colors ${
                occasion === timeMatches[0].title ? "border-ink bg-ink text-paper" : "border-line text-graphite hover:border-ink hover:text-ink"
              }`}
            >
              {timeMatches[0].title}{timeMatches[0].allDay ? "" : ` · ${fmtTime(timeMatches[0].start)}`} ✓
            </button>
            <p className="text-[11px] text-graphite mt-2">Matched to your calendar automatically — tap another below to change.</p>
          </div>
        )}

        {/* Several events around the photo's time: let her choose. */}
        {capturedAt && timeMatches.length > 1 && (
          <div>
            <span className="eyebrow block mb-2">Around this time — pick the event</span>
            <div className="flex flex-wrap gap-2">
              {timeMatches.map((ev, i) => (
                <button
                  key={`m${i}`}
                  type="button"
                  onClick={() => applyEvent(ev)}
                  title={ev.attendees.length ? `with ${ev.attendees.join(", ")}` : undefined}
                  className={`rounded-full px-3 py-1 text-[11px] border transition-colors ${
                    occasion === ev.title ? "border-ink bg-ink text-paper" : "border-line text-graphite hover:border-ink hover:text-ink"
                  }`}
                >
                  {ev.title}{ev.allDay ? "" : ` · ${fmtTime(ev.start)}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* The rest of that day's events (also shown when the photo has no capture time). */}
        {otherEvents.length > 0 && (
          <div>
            <span className="eyebrow block mb-2">{capturedAt ? "Also that day" : "Looks like"}</span>
            <div className="flex flex-wrap gap-2">
              {otherEvents.map((ev, i) => (
                <button
                  key={`d${i}`}
                  type="button"
                  onClick={() => applyEvent(ev)}
                  title={ev.attendees.length ? `with ${ev.attendees.join(", ")}` : undefined}
                  className="rounded-full border border-line text-graphite hover:border-ink hover:text-ink px-3 py-1 text-[11px] transition-colors"
                >
                  {ev.title}{ev.allDay ? "" : ` · ${fmtTime(ev.start)}`}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="block">
          <span className="eyebrow block mb-3">Worn with</span>
          <input value={wornWith} onChange={(e) => setWornWith(e.target.value)} placeholder="who you were with" className="underline-input" />
        </label>

        <div>
          <span className="eyebrow block mb-3">Tags</span>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((t) => (
                <button key={t} onClick={() => removeTag(t)} className="rounded-full border border-ink bg-ink text-paper px-3 py-1 text-[11px]">
                  {t} <span className="opacity-60">×</span>
                </button>
              ))}
            </div>
          )}
          <input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag(tagDraft);
              }
            }}
            placeholder="TYPE A TAG, PRESS ENTER"
            className="underline-input text-[11px] tracking-wide2 uppercase placeholder:text-graphite mb-3"
          />
          {tagSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tagSuggestions.map((t) => (
                <button key={t} onClick={() => addTag(t)} className="rounded-full border border-line text-graphite hover:text-ink px-3 py-1 text-[11px] transition-colors">
                  + {t}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <span className="eyebrow block mb-3">What you wore <span className="text-graphite normal-case tracking-normal">(optional)</span></span>
          <input value={pieceFilter} onChange={(e) => setPieceFilter(e.target.value)} placeholder="FILTER PIECES" className="underline-input text-[11px] tracking-wide2 uppercase placeholder:text-graphite mb-3" />
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {shownPieces.map((i) => (
              <button
                key={i.id}
                onClick={() => togglePiece(i.id)}
                className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${
                  picked.includes(i.id) ? "border-ink bg-ink text-paper" : "border-line text-graphite hover:text-ink"
                }`}
              >
                {i.name}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="eyebrow block mb-3">Notes (optional)</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="underline-input resize-none" />
        </label>

        {error && <p className="text-sale text-xs uppercase tracking-wide2">{error}</p>}
        <button onClick={save} disabled={busy || uploading || (!photo && !occasion && tags.length === 0)} className="btn-solid w-full">
          {busy ? "Saving…" : "Save to diary"}
        </button>
      </div>

      {/* First-use empty state — nothing logged yet */}
      {looks.length === 0 && (
        <div className="border-t border-line pt-12 text-center max-w-sm mx-auto">
          <p className="font-display text-3xl tracking-tight">Your diary is empty</p>
          <p className="mt-4 text-sm text-graphite leading-relaxed">
            Log your first look above. Add a selfie and it dates itself from the photo and
            tags the occasion from your calendar. Every look you save builds the diary here.
          </p>
        </div>
      )}

      {/* Diary */}
      {looks.length > 0 && (
        <div className="border-t border-line pt-10">
          <p className="eyebrow text-center mb-6">The diary</p>

          {/* Filters */}
          <div className="space-y-4 mb-8">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SEARCH THE DIARY"
              className="underline-input text-center text-[11px] tracking-wide2 uppercase placeholder:text-graphite max-w-xs mx-auto block"
            />
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => setTagFilter(null)}
                className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${!tagFilter ? "border-ink bg-ink text-paper" : "border-line text-graphite hover:text-ink"}`}
              >
                all
              </button>
              {allTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setTagFilter((cur) => (cur === t ? null : t))}
                  className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${tagFilter === t ? "border-ink bg-ink text-paper" : "border-line text-graphite hover:text-ink"}`}
                >
                  {t}
                </button>
              ))}
              <button
                onClick={() => setWinnersOnly((v) => !v)}
                className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${winnersOnly ? "border-ink bg-ink text-paper" : "border-line text-graphite hover:text-ink"}`}
              >
                ♥ winners (4+)
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="eyebrow text-center text-graphite">No looks match.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-10">
              {filtered.map((l) => (
                <div key={l.id}>
                  <div className="aspect-[3/4] bg-paper overflow-hidden">
                    {l.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/looks/selfie?id=${l.id}`} alt={l.occasion || "look"} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <span className="eyebrow">Saved look</span>
                      </div>
                    )}
                  </div>
                  {l.rating ? <div className="mt-3"><Hearts value={l.rating} /></div> : null}
                  {l.occasion && <p className="font-display text-xl mt-2">{l.occasion}</p>}
                  {l.date && <p className="eyebrow mt-1">{new Date(l.date).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</p>}
                  {l.wornWith && <p className="text-[11px] text-graphite mt-1">with {l.wornWith}</p>}
                  {l.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {l.tags.map((t) => (
                        <span key={t} className="rounded-full border border-line px-2 py-0.5 text-[10px] text-graphite">{t}</span>
                      ))}
                    </div>
                  )}
                  {l.pieceIds.length > 0 && (
                    <p className="text-[11px] text-graphite mt-2 leading-snug">{l.pieceIds.map(nameById).join("  ·  ")}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
