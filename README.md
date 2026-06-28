# Closet Kit

**A self-hosted, AI-powered styling companion for your own wardrobe - catalogue what you own, get honest outfit and purchase advice in your own colours, and plan what to wear.**

Fork it, point it at your own Notion, upload your colour analysis, and deploy. Bring your own closet.

## Where this came from

This started as a project I built for my wife to solve a couple of real, everyday
problems: knowing what's actually in her wardrobe, whether a new piece genuinely
suits her colouring and body (or just duplicates something she owns), and what to
wear for a given occasion. It worked well enough that it seemed worth opening up -
stripped of anything personal - so anyone can run their own.

## Status: provided as-is, no support

This is a starter kit, released as a gift to the community. It is the engine and
scaffold, not a managed product:

- **MIT licensed** - do whatever you like with it.
- **No support.** Issues and feature requests are not actively monitored or maintained.
- **Bring your own everything** - your Notion workspace, your API keys, your colour
  analysis, your deployment.

If that works for you, it is a complete, working foundation. Make it yours.

## What it does

**My Closet**
- **Closet** - browse every piece; filter by category; search colour / designer / occasion.
- **Add** - add a new piece (saves straight to Notion).
- **Import** - catalogue a batch of photos, drop in a receipt screenshot, or forward an
  order email to a closet inbox and each piece is added for you. See [docs/import-setup.md](docs/import-setup.md).
- **Tidy** - bulk archive / restore / re-status pieces.

**Style**
- **Palette** - your personal colour analysis (season, best colours, neutrals, metals,
  patterns). **Upload your own** colour analysis and the page rebuilds around it (below).
- **Assess** - upload a photo of something you're eyeing; Claude returns a verdict, how the
  colour reads on you, how the cut suits you, what you own that pairs with it, and a duplicate heads-up.
- **Salon** - hair try-on: upload a selfie, pick a style or colour, and see a rendered look
  (via Replicate). Save favourites into your Looks diary.

**Wear**
- **Looks** - an outfit diary. Log what you wore, with optional **calendar integration**
  (point `CALENDAR_ICS_URL` at a calendar's secret iCal address for event-aware suggestions).
- **Occasion** - get a complete outfit composed from pieces you own for a specific occasion.
- **Saved** - your assessed looks and saved outfits.

**Shop**
- **Discover** - a discovery engine of pre-curated, shoppable archetype looks tuned to your
  style profile, each with direct links.
- **Wishlist** - track pieces you're considering.

Notion stays the source of truth, so you can edit in the app or directly in Notion.

## Upload your colour analysis

The Palette page renders a colour assessment - season, the colours that flatter you, your
best neutrals, metals, and patterns. It ships with a neutral **example** assessment, and you
replace it with your own in one of two ways:

1. **Upload (recommended)** - on the Palette page, click *Upload your colour analysis* and
   give it a photo of your professional colour-analysis result, a draping swatch fan, or a
   clear, well-lit selfie. Claude reads it into a structured assessment, which is saved
   (Vercel Blob) and drives the page from then on. *Reset to example* clears it. Not sure how
   to get one? *Where do I get a colour analysis?* opens a global guide (Korean-method labs,
   in-person analysts, free DIY guides) - edit the list in [`lib/colorAnalysisOptions.ts`](lib/colorAnalysisOptions.ts).
2. **Edit the defaults** - the fallback assessment and the closet colour-tier hints live in
   [`lib/profile.ts`](lib/profile.ts); edit it to change the defaults in code.

## Set up your Notion

You create your own databases - this kit ships with no data and no database ids.

1. Create a Notion **internal integration** at notion.so/profile/integrations and copy the
   token (starts with `ntn_`).
2. Create the databases you want (at minimum a Wardrobe database; optionally Assessed Looks,
   Looks / Outfit Diary, and Wishlist).
3. **Share** each database (and any parent page) with your integration: database → ••• →
   Connections → add your integration.
4. Copy each database id from its Notion URL into your environment (next section).

## Deploy

### 1. Push to GitHub and import to Vercel
Push this folder to your own repo, then "Add New Project" in Vercel and import it.

### 2. Add storage
Add **Vercel Blob** to the project (Storage tab) - it powers image uploads (try-on reference,
Salon results, your uploaded colour analysis) and injects `BLOB_READ_WRITE_TOKEN` automatically.

### 3. Set environment variables
See [.env.example](.env.example) for the full list. The essentials:

| Key | Purpose |
| --- | --- |
| `NOTION_TOKEN` | your integration token |
| `NOTION_DB_ID` | your wardrobe database id |
| `NOTION_ASSESSED_DB_ID` | "Assessed Looks" database id (Assess flow) |
| `ANTHROPIC_API_KEY` | from console.anthropic.com (powers Assess, Occasion, colour-analysis upload) |
| `APP_PASSCODE` | any passcode; gates the app |
| `BLOB_READ_WRITE_TOKEN` | image uploads (auto-set when you add Vercel Blob) |
| `REPLICATE_API_TOKEN` | optional; Salon hair try-on |
| `CALENDAR_ICS_URL` | optional; calendar integration for the Looks diary |
| `NOTION_LOOKS_DB_ID` / `NOTION_WISHLIST_DB_ID` | Looks diary / Wishlist |

### 4. Deploy
Vercel builds on every push. Visit the app, enter the passcode, done.

## Local development
```bash
cp .env.example .env.local   # fill in your own values
npm install
npm run dev                  # http://localhost:3000
```

## Notes
- **Auth** is a single shared passcode (httpOnly cookie). Fine for a personal app; swap for
  real auth if you need more.
- **Model** is set by `ANTHROPIC_MODEL`; change it in one place.

## License
MIT - see [LICENSE](LICENSE).
