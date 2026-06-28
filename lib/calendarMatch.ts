// Pure, client-safe calendar matching. Kept separate from lib/calendar.ts (which pulls the
// server-only node-ical) so the look form can run this in the browser without dragging Node
// built-ins into the client bundle.

export type TimedEvent = {
  title: string;
  start: string; // ISO
  end: string | null; // ISO
  allDay: boolean;
};

// Timed events that plausibly correspond to a selfie taken at `capturedAtIso`. A look selfie
// tends to be snapped from ~1h before an event starts up to ~1h after it ends, so an event
// matches when the capture instant falls inside [start - tol, (end||start) + tol]. All-day
// events have no usable time and are excluded (the day list still surfaces them). Returned
// closest-start-first so the single best match leads.
export function eventsNearTime<T extends TimedEvent>(events: T[], capturedAtIso: string, toleranceMin = 60): T[] {
  const t = Date.parse(capturedAtIso);
  if (Number.isNaN(t)) return [];
  const tol = toleranceMin * 60000;
  return events
    .filter((e) => !e.allDay && e.start)
    .filter((e) => {
      const start = Date.parse(e.start);
      if (Number.isNaN(start)) return false;
      const end = e.end ? Date.parse(e.end) : start;
      return t >= start - tol && t <= end + tol;
    })
    .sort((a, b) => Math.abs(Date.parse(a.start) - t) - Math.abs(Date.parse(b.start) - t));
}
