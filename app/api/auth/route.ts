import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { passcode } = await req.json();
  const expected = process.env.APP_PASSCODE;
  if (!expected) return NextResponse.json({ error: "App passcode is not configured" }, { status: 500 });
  if (passcode !== expected) return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set("wc_session", expected, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("wc_session", "", { path: "/", maxAge: 0 });
  return res;
}
