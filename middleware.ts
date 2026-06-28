import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // /api/inbound-email is a server-to-server webhook (no session cookie); it authenticates
  // itself with INBOUND_EMAIL_SECRET, so it bypasses the passcode gate.
  const isAuthRoute = pathname === "/login" || pathname === "/api/auth" || pathname === "/api/inbound-email";
  const session = req.cookies.get("wc_session")?.value;
  const authed = !!session && session === process.env.APP_PASSCODE;

  if (!authed && !isAuthRoute) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not authorised" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (authed && pathname === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
