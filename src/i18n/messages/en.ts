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
    soldOut: "Sold out",
    madeToOrder: "Made to order · {weeks} weeks",
    ready: "Ready to deliver",
  },
  notFound: {
    title: "This stone hasn't been carved yet.",
    back: "Back to the collection",
  },
} as const

type Widen<T> = { -readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> }
export type Messages = Widen<typeof en>
