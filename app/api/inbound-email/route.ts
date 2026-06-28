import { NextRequest, NextResponse } from "next/server";
import { extractReceiptItems } from "@/lib/anthropic";
import { fetchProductMeta, upgradeImageUrl } from "@/lib/product";
import { createItem } from "@/lib/notion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Inbound-email webhook. Point a dedicated address (e.g. closet@example.com) at an
// inbound-email provider (Resend, Postmark, SendGrid Inbound Parse, Cloudflare Email Workers)
// and set that provider to POST the parsed message here. She forwards purchase receipts in;
// fashion items get added to the closet with a clean product image.
//
// Auth: this route is excluded from the session-cookie middleware (the provider has no cookie).
// Set INBOUND_EMAIL_SECRET and have the provider include it as ?secret= or x-inbound-secret.
export async function POST(req: NextRequest) {
  try {
    // Fail closed: this route is public (no session cookie), so without a configured secret
    // it would be an open door to paid API calls + Notion writes + outbound fetches.
    const secret = process.env.INBOUND_EMAIL_SECRET;
    if (!secret) return NextResponse.json({ error: "inbound email not configured" }, { status: 503 });
    const provided = req.nextUrl.searchParams.get("secret") || req.headers.get("x-inbound-secret");
    if (provided !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const payload: any = await req.json().catch(() => ({}));
    // Accept the common inbound shapes (Resend / Postmark / SendGrid / Mailgun).
    const html = payload.html || payload.HtmlBody || payload["body-html"] || payload["html_body"] || "";
    const text = payload.text || payload.TextBody || payload["body-plain"] || payload["text_body"] || "";
    const content = (html || text || "").toString();
    if (!content) return NextResponse.json({ added: 0, note: "no email body" });

    const items = (await extractReceiptItems(content)).slice(0, 25); // cap fan-out per email
    const added: string[] = [];

    for (const it of items) {
      let image = it.imageUrl || null;
      // Prefer a clean product image from the product page when we have the link.
      if (it.productUrl) {
        try {
          const meta = await fetchProductMeta(it.productUrl);
          if (meta.image) image = meta.image;
        } catch {
          // keep the receipt image
        }
      }

      await createItem({
        name: it.name,
        category: it.category || undefined,
        status: "Owns",
        designer: it.brand || undefined,
        colours: it.colours || [],
        occasion: [],
        notes: it.price ? `Imported from receipt (${it.currency || ""} ${it.price})`.replace(/\s+/g, " ").trim() : "Imported from receipt",
        link: it.productUrl || undefined,
        // https-ify + de-thumbnail (e.g. Magento /cache/<hash>/) so emailed thumbnails aren't blurry.
        photo: upgradeImageUrl(image) || undefined
      });
      added.push(it.name);
    }

    return NextResponse.json({ added: added.length, items: added });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "inbound-email failed" }, { status: 500 });
  }
}
