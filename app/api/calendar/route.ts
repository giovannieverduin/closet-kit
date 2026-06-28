import { NextRequest, NextResponse } from "next/server";
import { eventsOnDate } from "@/lib/calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server-only: reads CALENDAR_ICS_URL and returns the day's events. Behind the /api auth
// middleware. Degrades to an empty list (never an error the form has to handle) when the
// URL isn't configured or the feed is unreachable.
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  const tz = Number(req.nextUrl.searchParams.get("tz")) || 0;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Missing or bad date" }, { status: 400 });
  }
  if (!process.env.CALENDAR_ICS_URL) {
    return NextResponse.json({ events: [], configured: false });
  }
  try {
    const events = await eventsOnDate(date, tz);
    return NextResponse.json(
      { events, configured: true },
      { headers: { "Cache-Control": "private, max-age=300" } }
    );
  } catch {
    return NextResponse.json({ events: [], configured: true });
  }
}
