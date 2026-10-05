// English is the source of truth for message keys. Arabic and French dictionaries are added in the
// Arabic/French pass and must provide every key (enforced by the Messages type).
export const en = {
  meta: {
    siteName: "Glowstone",
    tagline: "Time is the ultimate luxury.",
  },
  nav: {
    collection: "Collection",
    about: "About",
    contact: "Contact",
    account: "Account",
    cart: "Cart",
    menu: "Menu",
    close: "Close",
    language: "Language",
    home: "Glowstone home",
    main: "Main",
    skipToContent: "Skip to content",
  },
  footer: {
    newEditions: "New editions",
    newEditionsLead: "Be the first to know when a new edition is released.",
    emailPlaceholder: "Your email, for new editions",
    subscribe: "Subscribe",
    visit: "Visit",
    writeToUs: "Write to us",
    information: "Information",
    terms: "Terms",
    privacy: "Privacy",
    delivery: "Delivery & Returns",
    madeInLebanon: "Made in Lebanon.",
  },
  edition: {
    remaining: "Edition of {edition} — {remaining} remaining",
    remainingCount: "{remaining} remaining",
    of: "Edition of {edition}",
    soldOut: "Sold out",
    madeToOrder: "Made to order · {weeks} weeks",
    ready: "Ready to deliver",
  },
  catalog: {
    photoAlt: "{name}, photo {n} of {total}",
    dimensions: "{height} × {width} × {depth} cm",
  },
  // Home lines become editable `site_content` in B6.
  home: {
    metaTitle: "Glowstone — Time is the ultimate luxury.",
    metaDescription: "Wine racks hand-carved from Lebanese limestone, in small numbered editions. Made in Lebanon.",
    heroAlt: "Batroun rack in cream limestone with a glass of red wine on a stone wall above the misty Qadisha Valley",
    shopCollection: "Shop collection",
    quote: "From stone, form emerges.",
    quoteLine: "Limited objects for wine & living.",
    selectedPieces: "Selected pieces",
    viewAll: "View all",
    previousPieces: "Previous pieces",
    nextPieces: "Next pieces",
    craftLabel: "The craft",
    craftLead: "Every piece begins as a single block of Lebanese limestone and is carved by hand, with chisel and mallet.",
    craftBody: "The marks of the chisel stay in the stone.",
    ourStory: "Our story",
    crestAlt: "The hand-broken crest of a Sannine piece, its chisel marks catching the light",
    boreAlt: "The ringed wall of a hole bored through limestone",
    boreCaption: "The bore",
    spotlightText: "The largest piece in the collection. Edge notches and a central row of holes hold fourteen bottles.",
    viewThePiece: "View the piece",
  },
  notFound: {
    title: "This stone hasn't been carved yet.",
    back: "Back to the collection",
  },
} as const

type Widen<T> = { -readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> }
export type Messages = Widen<typeof en>
