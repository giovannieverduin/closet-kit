// The exact option vocabularies from the wardrobe Notion database.
// Both the Add form and the vision-extraction prompt use these so values map cleanly.

export const CATEGORIES = [
  "Dress", "Top", "Knitwear", "Trousers", "Jeans", "Skirt", "Shorts", "Sportswear",
  "Outerwear", "Swimwear", "Shoes", "Bag", "Jewelry", "Accessory", "Outfit"
] as const;

// Guidance for the vision/extraction prompts so pieces land in the right category.
export const CATEGORY_HINT =
  "Category notes: watches → Jewelry; denim → Jeans; non-denim trousers/pants/leggings → Trousers; " +
  "activewear, gym, tennis, yoga or ski pieces → Sportswear; jumpers/cardigans/knits → Knitwear; " +
  "Accessory means small accessories only (hats, caps, scarves, belts, sunglasses, gloves) — " +
  "handbags are Bag and footwear is Shoes, never Accessory.";

// Warm-Spring forward: her best warm colours first, then warm neutrals and metals, then the
// cooler legacy options kept so previously-tagged pieces still resolve (and read as caution).
export const COLOURS = [
  // Warm — flatters her most
  "Coral", "Coral Red", "Peach", "Apricot", "Salmon", "Mango", "Golden Yellow", "Butter Yellow",
  "Warm Turquoise", "Aqua", "Leaf Green", "Apple Green", "Periwinkle", "Clear Warm Blue",
  // Warm neutrals & metals
  "Ivory", "Cream", "Warm Beige", "Camel", "Golden Tan", "Golden Brown", "Tan", "Nude/Beige",
  "Gold", "Rose Gold",
  // Cooler / legacy (kept for existing items; off-palette for Warm Spring)
  "Powder Blue", "Cornflower", "Cobalt", "Navy", "Lavender", "Lilac", "Soft Rose", "Blush",
  "Fuchsia", "Raspberry", "Red", "Burgundy", "Black", "Charcoal", "Cool Grey", "Silver",
  // General
  "White", "Green", "Metallic", "Multicolour"
] as const;

// Suggestions for the Designer field. Not a hard list — any brand can be entered/extracted.
export const DESIGNERS = [
  "Chanel", "Hermès", "Dior", "Gucci", "Bottega Veneta", "Saint Laurent", "Prada", "Miu Miu",
  "Chloe", "Manolo Blahnik", "Christian Louboutin", "Jimmy Choo", "Tod's", "Self-Portrait",
  "Solace London", "Zimmermann", "Aje", "Acler", "Elliatt", "Nike", "Other"
] as const;

export const FABRICS = ["Silk", "Satin", "Crepe", "Lace", "Linen", "Cotton", "Jersey", "Leather", "Suede", "Knit", "Chiffon", "Metallic"] as const;

export const OCCASIONS = ["Everyday", "Work", "Cocktail", "Wedding / Formal", "Resort / Beach", "Evening", "Travel"] as const;

export const SEASONS = ["Spring", "Summer", "Autumn", "Winter"] as const;

export const STATUSES = ["Owns", "Wishlist", "Inspiration"] as const;

// Virtual try-on only works on garments. Map our category to the FASHN garment class,
// or null for pieces that can't be tried on (bags, shoes, jewelry, accessories).
export function tryOnCategory(category: string | null): "tops" | "bottoms" | "one-pieces" | null {
  switch (category) {
    case "Dress":
    case "Outfit":
      return "one-pieces";
    case "Top":
    case "Knitwear":
    case "Outerwear":
      return "tops";
    case "Trousers":
    case "Jeans":
    case "Skirt":
    case "Shorts":
    case "Bottom": // legacy value
      return "bottoms";
    default:
      return null;
  }
}
