# Wardrobe Starter Kit

A self-hosted wardrobe and styling companion you run for your own closet. It uses
a Notion database as the source of truth for your pieces, and adds a photo "Assess"
feature that judges anything you are considering against your colouring, your body,
and the pieces you already own - powered by Claude.

Fork it, point it at your own Notion, edit one profile file, and deploy. Bring your
own closet.

## Status: provided as-is, no support

This is a starter kit, released as a gift to the community. It is the engine and
scaffold, not a managed product:

- **MIT licensed** - do whatever you like with it.
- **No support.** Issues and feature requests are not actively monitored or
  maintained. There is no roadmap and no SLA.
- **Bring your own everything** - your Notion workspace, your API keys, your
  colour analysis, your deployment.

If that works for you, it is a complete, working foundation. Make it yours.

## What it does
- **Closet** - browse every piece, filter by category, search colour / designer / occasion.
- **Add** - add a new piece (saves straight to Notion; attach the photo in Notion).
- **Assess** - upload a photo of something you are eyeing. Claude returns a verdict,
  how the colour reads on you, how the cut suits you, what you own that pairs with it,
  and a duplicate heads-up.
- **Import** - catalogue a batch of photos, drop in a receipt screenshot, or forward
  an order email to a closet inbox and each piece is added for you. Setup for the email
  flow and the "find original product" key is in [docs/import-setup.md](docs/import-setup.md).

Notion stays the source of truth, so you can edit in the app or directly in Notion.

## Make it yours: edit your style profile

Everything personal lives in **`lib/profile.ts`**. It ships with a neutral example
profile (a warm, light, clear palette) that describes no real person. Replace it with
your own:

- Your colour analysis (a professional seasonal draping gives the best results, but
  any honest self-assessment works).
- Your measurements and silhouette notes (include only what you are comfortable storing).
- Your palette swatches, best neutrals, metals, and patterns.

The AI stylist and assessment are only as good as that profile, so keep it current.

## Set up your Notion

You create your own databases - this kit ships with no data and no database ids.

1. Create a Notion **internal integration** at notion.so/profile/integrations and copy
   the token (starts with `ntn_`).
2. Create the databases you want to use (at minimum a Wardrobe database; optionally
   Assessed Looks, Looks / Outfit Diary, and Wishlist).
3. **Share** each database (and any parent page) with your integration:
   database → ••• → Connections → add your integration.
4. Copy each database id from its Notion URL into your environment (next section).

## Deploy (about 10 minutes)

### 1. Push to GitHub and import to Vercel
Push this folder to your own repo, then "Add New Project" in Vercel and import it.

### 2. Set environment variables in Vercel (Project → Settings → Environment Variables)
See [.env.example](.env.example) for the full list. The essentials:

| Key | Value |
| --- | --- |
| `NOTION_TOKEN` | your integration token |
| `NOTION_DB_ID` | your wardrobe database id |
| `NOTION_ASSESSED_DB_ID` | your "Assessed Looks" database id (for the Assess flow) |
| `ANTHROPIC_API_KEY` | from console.anthropic.com |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-6` (optional; default) |
| `APP_PASSCODE` | any passcode; gates the app |
| `INBOUND_EMAIL_SECRET` | optional; enables forwarding receipts by email (see [docs/import-setup.md](docs/import-setup.md)) |
| `NEXT_PUBLIC_CLOSET_EMAIL` | optional; inbox address shown on the Import page |
| `SERPAPI_KEY` | optional; only for the photo-only reverse-image "find product" path |

### 3. Add a custom domain (optional)
Vercel → Project → Settings → Domains → add your domain and follow the DNS steps.

### 4. Deploy
Vercel builds on every push. Visit the app, enter the passcode, done.

## Local development
```bash
cp .env.example .env.local   # fill in your own values
npm install
npm run dev                  # http://localhost:3000
```

## Notes
- **Auth** is a single shared passcode (httpOnly cookie). Fine for a personal app.
  Swap for real auth if you need more.
- **Photos** for the Assess feature are sent to Claude but not stored. To save a
  considered piece *with* its photo, add Vercel Blob and write the URL into the Notion
  `Photo` property.
- **Model** is set by `ANTHROPIC_MODEL`; change it in one place.

## License
MIT - see [LICENSE](LICENSE).
