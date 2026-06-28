import { describe, it, expect } from "vitest";
import * as ical from "node-ical";
import { suggestTagFromTitle, eventsFromParsed } from "./calendar";
import { eventsNearTime } from "./calendarMatch";

type Ev = { title: string; start: string; end: string | null; allDay: boolean; attendees: string[]; suggestedTag: string | null };
const ev = (title: string, start: string, end: string | null = null, allDay = false): Ev => ({
  title, start, end, allDay, attendees: [], suggestedTag: null
});

describe("eventsNearTime", () => {
  const dinner = ev("Dinner", "2026-06-20T19:00:00.000Z", "2026-06-20T21:00:00.000Z");
  const lunch = ev("Lunch", "2026-06-20T12:00:00.000Z", "2026-06-20T13:00:00.000Z");
  const allDayTrip = ev("Trip", "2026-06-20T00:00:00.000Z", null, true);

  it("matches a selfie within an hour before the event starts", () => {
    const m = eventsNearTime([dinner], "2026-06-20T18:15:00.000Z");
    expect(m.map((e) => e.title)).toEqual(["Dinner"]);
  });
  it("matches a selfie within an hour after the event ends", () => {
    const m = eventsNearTime([dinner], "2026-06-20T21:45:00.000Z");
    expect(m.map((e) => e.title)).toEqual(["Dinner"]);
  });
  it("excludes a selfie outside the ±1h window", () => {
    expect(eventsNearTime([dinner], "2026-06-20T16:00:00.000Z")).toEqual([]);
  });
  it("returns multiple matches closest-start-first", () => {
    const close = ev("Drinks", "2026-06-20T18:30:00.000Z", "2026-06-20T19:30:00.000Z");
    const m = eventsNearTime([dinner, close], "2026-06-20T18:40:00.000Z");
    expect(m.map((e) => e.title)).toEqual(["Drinks", "Dinner"]);
  });
  it("ignores all-day events and lunch far away", () => {
    const m = eventsNearTime([lunch, allDayTrip, dinner], "2026-06-20T19:10:00.000Z");
    expect(m.map((e) => e.title)).toEqual(["Dinner"]);
  });
  it("returns [] for an unparseable capture time", () => {
    expect(eventsNearTime([dinner], "not-a-date")).toEqual([]);
  });
});

describe("suggestTagFromTitle", () => {
  it("maps weddings", () => {
    expect(suggestTagFromTitle("Sara & Tom's Wedding")).toBe("wedding guest");
  });
  it("maps dinners/dates to date night", () => {
    expect(suggestTagFromTitle("Dinner with the Haddads")).toBe("date night");
    expect(suggestTagFromTitle("Anniversary")).toBe("date night");
  });
  it("maps work-ish events", () => {
    expect(suggestTagFromTitle("Team standup")).toBe("work");
    expect(suggestTagFromTitle("Quarterly review")).toBe("work");
  });
  it("maps parties/birthdays to event", () => {
    expect(suggestTagFromTitle("Mia's birthday party")).toBe("event");
  });
  it("maps travel", () => {
    expect(suggestTagFromTitle("Flight to Milan")).toBe("travel");
  });
  it("returns null when nothing fits", () => {
    expect(suggestTagFromTitle("Pick up dry cleaning")).toBeNull();
    expect(suggestTagFromTitle("")).toBeNull();
  });
});

const SAMPLE_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//test//EN
BEGIN:VEVENT
UID:timed-1
SUMMARY:Dinner with the Haddads
DTSTART:20260624T180000Z
DTEND:20260624T210000Z
ATTENDEE;CN=Lina Haddad:mailto:lina@example.com
ATTENDEE;CN=Omar Haddad:mailto:omar@example.com
END:VEVENT
BEGIN:VEVENT
UID:allday-1
SUMMARY:Cousin's Wedding
DTSTART;VALUE=DATE:20260625
DTEND;VALUE=DATE:20260626
END:VEVENT
END:VCALENDAR`;

describe("eventsFromParsed", () => {
  const parsed = ical.sync.parseICS(SAMPLE_ICS);

  it("returns the timed event on its date, with attendees and a suggested tag", () => {
    const events = eventsFromParsed(parsed, "2026-06-24", 0);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Dinner with the Haddads");
    expect(events[0].allDay).toBe(false);
    expect(events[0].suggestedTag).toBe("date night");
    expect(events[0].attendees).toEqual(["Lina Haddad", "Omar Haddad"]);
  });

  it("returns the all-day event on its date", () => {
    const events = eventsFromParsed(parsed, "2026-06-25", 0);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Cousin's Wedding");
    expect(events[0].allDay).toBe(true);
    expect(events[0].suggestedTag).toBe("wedding guest");
  });

  it("returns nothing on a day with no events", () => {
    expect(eventsFromParsed(parsed, "2026-06-26", 0)).toHaveLength(0);
  });
});
