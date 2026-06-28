// Global, editable list of ways to get a personal colour analysis. Shown in the
// "Where do I get a colour analysis?" popup on the Palette page.
//
// These are widely-known starting points, NOT endorsements, and are deliberately
// global (not region-specific). Edit freely for your own region or preferences.
export type AnalysisLink = { label: string; href: string };

export type AnalysisOption = {
  name: string;
  blurb: string;
  note: string; // format · accuracy · cost, at a glance
  links?: AnalysisLink[];
};

export const ANALYSIS_OPTIONS: AnalysisOption[] = [
  {
    name: "Korean-method personal colour analysis",
    blurb:
      "The most systematic approach: structured fabric draping under controlled, neutral light, working from the four seasons down to 8, 12, or 16 detailed sub-tones. It originated in Korea (studios cluster in Seoul) and is now offered by trained analysts worldwide.",
    note: "In person · most rigorous & detailed · paid session",
    links: [{ label: "Find an analyst near you", href: "https://www.google.com/search?q=personal+color+analysis+near+me" }]
  },
  {
    name: "In-person colour analyst / image consultant",
    blurb:
      "A trained consultant drapes you in colour swatches in good light and assigns your seasonal palette. Global options include House of Colour and Colour Me Beautiful, alongside many independent consultants.",
    note: "In person · reliable · paid session",
    links: [
      { label: "House of Colour", href: "https://houseofcolour.com" },
      { label: "Colour Me Beautiful", href: "https://colourmebeautiful.com" }
    ]
  },
  {
    name: "Free DIY self-analysis",
    blurb:
      "The Concept Wardrobe is a thorough, free guide to working out your season at home — undertone, value, and chroma tests with clear examples. A great starting point before paying for a session.",
    note: "At home · free · less precise than draping",
    links: [{ label: "The Concept Wardrobe", href: "https://theconceptwardrobe.com" }]
  },
  {
    name: "Photo or app-based",
    blurb:
      "Apps and online services estimate your palette from a selfie. Quick and inexpensive, but lighting-sensitive and the least accurate. You can also just upload a clear, well-lit selfie right here and let the app take a first pass.",
    note: "Online · fast · least accurate"
  }
];
