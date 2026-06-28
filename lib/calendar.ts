// Read-only calendar via a secret iCal (ICS) URL — e.g. a shared family Google Calendar's
// "Secret address in iCal format". Server-only: the URL grants read access to the whole
// calendar, so it lives in CALENDAR_ICS_URL (Vercel env) and is never sent to the client.

export type CalEvent = {
  title: string;
  start: string; // ISO
  end: string | null; // ISO
  allDay: boolean;
  attendees: string[]; // display names where available
  suggestedTag: string | null; // mapped from the title, for the diary's tags
};

const pad = (n: number) => String(n).padStart(2, "0");

/* eslint-disable @typescript-eslint/no-explicit-any */
function attendeesOf(e: any): string[] {
  const raw = e?.attendee;
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr
    .map((a: any) => {
      if (a && typeof a === "object") {
        const cn = a.params?.CN || a.CN;
        if (cn) return String(cn);
        const val = String(a.val || "");
        return val.replace(/^mailto:/i, "");
      }
      return String(a).replace(/^mailto:/i, "");
    })
    .map((s: string) => s.trim())
    .filter(Boolean)
    // drop the calendar owner / obvious noise duplicates
    .filter((s, i, all) => all.indexOf(s) === i);
}

// Map an event title to one of the diary's seed tags, or null if nothing fits.
export function suggestTagFromTitle(title: string): string | null {
  const t = (title || "").toLowerCase();
  if (/\bwedding\b/.test(t)) return "wedding guest";
  if (/\b(dinner|date night|anniversary|valentine)\b/.test(t)) return "date night";
  if (/\b(work|meeting|standup|stand-up|1:1|review|office|call|sync|interview|conference)\b/.test(t)) return "work";
  if (/\b(party|birthday|bday|celebration|drinks|gala|launch|graduation)\b/.test(t)) return "event";
  if (/\b(flight|trip|travel|airport|vacation|holiday|hotel|resort|beach)\b/.test(t)) return "travel";
  return null;
}

// Events occurring on the given local calendar date. `tzOffsetMin` is the client's
// Date.getTimezoneOffset() (minutes) so the day window matches the user's local day.
export async function eventsOnDate(dateStr: string, tzOffsetMin = 0): Promise<CalEvent[]> {
  const url = process.env.CALENDAR_ICS_URL;
  if (!url) return [];
  // Lazy import so node-ical stays out of the route's static graph (Next build collection).
  const mod: any = await import("node-ical");
  const ical = mod.async ? mod : mod.default || mod;
  const data: any = await ical.async.fromURL(url);
  return eventsFromParsed(data, dateStr, tzOffsetMin);
}

// Pure filtering over an already-parsed iCal object (split out for testing).
export function eventsFromParsed(data: any, dateStr: string, tzOffsetMin = 0): CalEvent[] {
  const [y, m, d] = dateStr.split("-").map(Number);
  // Local midnight on dateStr, expressed as a UTC instant: UTC = localClock + offset.
  const dayStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) + tzOffsetMin * 60000);
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000 - 1);

  const out: CalEvent[] = [];

  for (const key of Object.keys(data)) {
    const e = data[key];
    if (!e || e.type !== "VEVENT") continue;
    const allDay = e.datetype === "date";

    let occursAt: Date | null = null;
    if (e.rrule) {
      const between = e.rrule.between(dayStart, dayEnd, true);
      if (between && between.length) occursAt = between[0];
    } else if (allDay && e.start) {
      // All-day: node-ical builds the start at local midnight, so compare local components.
      const s = new Date(e.start);
      const sStr = `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`;
      if (sStr === dateStr) occursAt = s;
    } else if (e.start) {
      const s = new Date(e.start);
      if (s >= dayStart && s <= dayEnd) occursAt = s;
    }
    if (!occursAt) continue;

    const title = e.summary || "Event";
    out.push({
      title,
      start: occursAt.toISOString(),
      end: e.end ? new Date(e.end).toISOString() : null,
      allDay,
      attendees: attendeesOf(e),
      suggestedTag: suggestTagFromTitle(title)
    });
  }

  out.sort((a, b) => a.start.localeCompare(b.start));
  return out;
}
