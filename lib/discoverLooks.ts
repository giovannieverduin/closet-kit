// Pre-curated archetype looks, tuned to the wearer's style profile (see lib/profile.ts).
// EVERY shoppable item — the hero AND each accessory — carries
// brand, a one-line description, the price as listed at sourcing time, and a DIRECT link to
// the actual product page (never a search). The hero also has an image + category so the app
// can try it on her. Refresh re-sources all of these from the live product pages.

export type DiscoverProduct = {
  name: string;
  brand: string;
  description: string;
  price: string;        // as listed at sourcing time, e.g. "$495". Blank only if unresolved.
  link: string;         // direct product-page URL (not a search)
  image?: string;       // hero only
  category?: string;    // hero only ("Dress")
};

export type DiscoverLook = {
  archetype: string;
  title: string;
  rationale: string;
  hero: DiscoverProduct;
  accessories: DiscoverProduct[];
};

export const DISCOVER_LOOKS: DiscoverLook[] = [
  {
    archetype: "Sporty",
    title: "Clean navy, off-duty",
    rationale: "A deep cool navy that sharpens your blue eyes and fair skin, with a ribbed column that skims sporty-straight but still nips in at the waist.",
    hero: {
      name: "Ribbed knitted midi dress",
      brand: "Rodebjer",
      description: "Navy merino-wool ribbed-knit midi with a round neck and long sleeves — a clean, sporty column that holds the waist.",
      price: "€229",
      image: "https://cdn-images.farfetch-contents.com/19/10/27/32/19102732_41847242_1000.jpg",
      link: "https://www.farfetch.com/shopping/women/rodebjer-ribbed-knitted-midi-dress-item-19102732.aspx",
      category: "Dress"
    },
    accessories: [
      { name: "Original Achilles leather sneakers", brand: "Common Projects", description: "Made-in-Italy white leather low-top with gold-foil serial numbers.", price: "$420", link: "https://www.farfetch.com/shopping/men/common-projects-original-achilles-leather-sneakers-item-21491084.aspx" },
      { name: "Mini Penelope leather shoulder bag", brand: "Wandler", description: "Aqua-blue leather mini crossbody with tonal stitching, gold-tone hardware and an adjustable strap.", price: "$677", link: "https://www.farfetch.com/shopping/women/wandler-mini-penelope-leather-shoulder-bag-item-17555906.aspx" }
    ]
  },
  {
    archetype: "Everyday",
    title: "Soft wrap, blue",
    rationale: "A wrap marks your waist and the soft blue is your everyday flatterer — silk that skims rather than clings.",
    hero: {
      name: "Mona wrap dress",
      brand: "Cortana",
      description: "Marine-blue silk-linen sleeveless wrap dress with a halter V-neck and a side tie that marks the waist.",
      price: "€1,257",
      image: "https://cdn-images.farfetch-contents.com/36/04/25/28/36042528_67644544_1000.jpg",
      link: "https://www.farfetch.com/shopping/women/cortana-mona-wrap-style-dress-item-36042528.aspx",
      category: "Dress"
    },
    accessories: [
      { name: "Lauren leather ballet flats", brand: "Chloé", description: "Light-blue nappa leather ballet flats with the signature scalloped trim and a round toe.", price: "$400", link: "https://www.farfetch.com/shopping/women/chloe-lauren-ballet-flats-item-28329602.aspx" },
      { name: "The New York Midi textured-leather tote", brand: "DeMellier", description: "Structured navy textured-leather day tote with soft folds, belt detail and tubular top handles.", price: "$595", link: "https://www.net-a-porter.com/en-us/shop/product/demellier/bags/tote-bags/the-new-york-midi-textured-leather-tote/1647597314670248" }
    ]
  },
  {
    archetype: "Business",
    title: "Boardroom blue",
    rationale: "Crisp and structured with a belt to define your waist; keep it cool-toned blue right near your face.",
    hero: {
      name: "Striped belted midi shirt dress",
      brand: "Vince",
      description: "Blue-and-white striped TENCEL-blend belted shirt dress with a cut-away collar and a nipped midi silhouette.",
      price: "€336",
      image: "https://cdn-images.farfetch-contents.com/19/87/65/74/19876574_50112715_1000.jpg",
      link: "https://www.farfetch.com/shopping/women/vince-striped-belted-midi-shirt-dress-item-19876574.aspx",
      category: "Dress"
    },
    accessories: [
      { name: "Romy 85 suede pumps", brand: "Jimmy Choo", description: "Navy Italian-suede pointed-toe pumps on a slim 85mm heel.", price: "$695", link: "https://www.net-a-porter.com/en-us/shop/product/jimmy-choo/shoes/mid-heel/romy-85-suede-pumps/7751388225862925" },
      { name: "Structured leather top-handle bag", brand: "Fendi", description: "Navy structured calf-leather top-handle bag with a twist-lock closure.", price: "", link: "https://www.farfetch.com/shopping/women/fendi-structured-leather-tote-bag-item-30547737.aspx" }
    ]
  },
  {
    archetype: "Party",
    title: "Cobalt power move",
    rationale: "Cobalt is your bold cool move; the draped one-shoulder nips your waist and the midi length carries clean down your frame.",
    hero: {
      name: "Draped one-shoulder midi dress",
      brand: "Carven",
      description: "Dark cobalt-blue wool draped one-shoulder midi with an asymmetric neckline that defines the waist.",
      price: "$880",
      image: "https://cdn-images.farfetch-contents.com/31/07/28/20/31072820_60163554_1000.jpg",
      link: "https://www.farfetch.com/shopping/women/carven-draped-one-shoulder-midi-dress-item-31072820.aspx",
      category: "Dress"
    },
    accessories: [
      { name: "Portofino 105 metallic leather sandals", brand: "Gianvito Rossi", description: "Silver metallic-leather strappy stiletto sandals on a 105mm heel.", price: "$1,195", link: "https://www.net-a-porter.com/en-us/shop/product/gianvito-rossi/shoes/high-heel/portofino-105-metallic-leather-sandals/17957409491330346" },
      { name: "Callie clutch bag", brand: "Jimmy Choo", description: "Silver cracked-leather Callie clutch with crystal embellishment and a chain strap.", price: "$1,250", link: "https://www.farfetch.com/shopping/women/jimmy-choo-callie-clutch-bag-item-26082713.aspx" }
    ]
  },
  {
    archetype: "Street",
    title: "Blue slip, street",
    rationale: "A bias slip in sapphire satin, street-styled — body-skimming and dead-on your palette, with a black leather biker thrown over and chunky trainers to scuff it up.",
    hero: {
      name: "V-neck satin midi dress",
      brand: "Calvin Klein",
      description: "Sapphire-blue silk-blend satin slip midi with a V-neck, ruched sides and adjustable spaghetti straps.",
      price: "€170",
      image: "https://cdn-images.farfetch-contents.com/23/79/22/34/23792234_53929548_1000.jpg",
      link: "https://www.farfetch.com/shopping/women/calvin-klein-v-neck-satin-midi-dress-item-23792234.aspx",
      category: "Dress"
    },
    accessories: [
      { name: "Leather biker jacket", brand: "Acne Studios", description: "Short boxy black grained-leather moto jacket with multiple zips and a cropped belted waist.", price: "$510", link: "https://www.net-a-porter.com/en-us/shop/product/acne-studios/clothing/biker-jackets/leather-biker-jacket/16494023980510571" },
      { name: "Sporty chunky sneakers", brand: "Naked Wolfe", description: "Black leather low-top trainers on a chunky platform rubber sole.", price: "€192", link: "https://www.farfetch.com/shopping/women/naked-wolfe-sporty-chunky-sneakers-item-17757416.aspx" }
    ]
  },
  {
    archetype: "Resort",
    title: "Broderie by the water",
    rationale: "Crisp white broderie for the heat — relaxed, but the cut still marks your waist; keep your sandals and clutch cool and pale, never warm tan.",
    hero: {
      name: "Broderie anglaise maxi dress",
      brand: "Self-Portrait",
      description: "White cotton broderie anglaise maxi with slim straps and a sleeveless, column silhouette.",
      price: "€357",
      image: "https://cdn-images.farfetch-contents.com/20/08/02/22/20080222_45263920_1000.jpg",
      link: "https://www.farfetch.com/shopping/women/self-portrait-broderie-anglaise-maxi-dress-item-20080222.aspx",
      category: "Dress"
    },
    accessories: [
      { name: "Carousel raffia slides", brand: "Zimmermann", description: "Pale woven-raffia flat slides with a soft bow detail.", price: "$375", link: "https://www.net-a-porter.com/en-us/shop/product/zimmermann/shoes/flat/carousel-raffia-slides/46376663163022919" },
      { name: "Bailey striped crocheted raffia clutch", brand: "Loeffler Randall", description: "Cream crocheted-raffia clutch with a subtle stripe and a relaxed pouch shape.", price: "$295", link: "https://www.net-a-porter.com/en-us/shop/product/loeffler-randall/bags/clutch-bags/bailey-striped-crocheted-raffia-clutch/46376663162925947" }
    ]
  }
];
