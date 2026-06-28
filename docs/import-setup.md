# Importing purchases into the closet

The **Import** tab (`/import`) gets new pieces into the closet three ways. The first
two work out of the box; the third (forwarding receipt emails) needs one server
setting. Find-original-product has its own optional key.

## The three ways in

1. **Photos** - pick a batch of garment photos. Each is read by Claude, background
   removed, and saved. No setup.
2. **Receipt / order screenshot** - upload screenshot(s) of an order confirmation;
   each item is pulled out (multiple screenshots count as one order). No setup.
3. **Forward the email** - forward the order-confirmation email to your closet inbox
   and each fashion item lands in the closet automatically, with a clean product
   photo pulled from the brand's page. Needs the setup below.

## Forwarding receipts by email (inbound-email flow)

The webhook lives at `POST /api/inbound-email`. It is excluded from the passcode
middleware (your email provider has no session cookie), so it is **fail-closed**:
without a configured secret it returns `503` and does nothing.

### One-time setup

1. **Pick a dedicated inbox.** A single address that receipts are forwarded to,
   e.g. `closet@example.com`. (This is the address shown to the user on the
   Import page via `NEXT_PUBLIC_CLOSET_EMAIL`; default `closet@example.com`.)
   There is one shared inbox - the route does not yet distinguish per user.
2. **Point an inbound-email provider at the webhook.** Any of Resend, Postmark,
   SendGrid Inbound Parse, Mailgun, or Cloudflare Email Workers works - the route
   accepts all of their common payload shapes. Configure the provider to POST the
   parsed message to:
   ```
   https://<your-domain>/api/inbound-email?secret=<INBOUND_EMAIL_SECRET>
   ```
   (or send the secret as the `x-inbound-secret` header instead of the query param).
3. **Set `INBOUND_EMAIL_SECRET`** on the server (Vercel env). It must match the
   value the provider sends. Any wrong or missing secret is rejected (`401`/`503`).

Each email is capped at 25 items to bound the fan-out. Items come in as `Owns`
with a "Imported from receipt" note and the price when present.

## Find the original product (`SERPAPI_KEY`, optional)

`/api/find-product` resolves a clean product page + image. Its paths:

| Input you have | Path | Needs `SERPAPI_KEY`? |
| --- | --- | --- |
| A product **link** | fetch the page's `og:image`, title, price | No |
| A **description / photo** (brand, name, colour) | Claude web search finds the page | No |
| Only a **hosted photo**, no link | reverse-image search (SerpAPI Google Lens) | **Yes** |

So the link path and the description/photo web-search path work with no key. Only
the photo-only reverse-image lookup needs `SERPAPI_KEY` (from serpapi.com). You can
swap the provider with `REVERSE_IMAGE_API_URL`.

## Environment variables (summary)

| Key | When you need it |
| --- | --- |
| `INBOUND_EMAIL_SECRET` | to enable forwarding receipts by email |
| `NEXT_PUBLIC_CLOSET_EMAIL` | optional; the inbox address shown on the Import page (default `closet@example.com`) |
| `SERPAPI_KEY` | optional; only for the photo-only reverse-image find-product path |
| `REVERSE_IMAGE_API_URL` | optional; override the SerpAPI endpoint |
