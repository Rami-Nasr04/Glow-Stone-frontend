import { CONTACT_EMAIL } from "@/config/site"
import type { ProductSummary } from "@/features/catalog/types"
import { interpolate } from "@/i18n/format"
import type { Messages } from "@/i18n/messages/en"
import { MESSAGES } from "@/i18n/useLocale"
import { photoUrl } from "@/lib/images"

// What search engines read about a piece and about the shop (schema.org, as JSON-LD in the page's head). Written from
// the piece's own data only: nothing here states a fact the API doesn't hold.

/** "Sannine: a hand-carved limestone wine rack for 10 bottles, made in Lebanon." and the piece's summary after it. */
export function pieceDescription(piece: ProductSummary, m: Messages = MESSAGES.en): string {
  const bottles = piece.bottles === 1 ? m.product.specs.bottle : interpolate(m.product.specs.bottles, { count: piece.bottles })
  const first = interpolate(m.product.metaDescription, { name: piece.name, stone: piece.stoneType.toLowerCase(), bottles })
  return piece.summary ? `${first} ${piece.summary}` : first
}

/** "Sannine limestone wine rack": the alt text of a piece's photo. */
export function pieceAlt(piece: Pick<ProductSummary, "name" | "stoneType">, m: Messages, template = m.catalog.pieceAlt): string {
  return interpolate(template, { name: piece.name, stone: piece.stoneType.toLowerCase() })
}

export interface ProductJsonLd {
  "@context": "https://schema.org"
  "@type": "Product"
  name: string
  description: string
  url: string
  image: string[]
  material: string
  color: string
  brand: { "@type": "Brand"; name: string }
  offers: {
    "@type": "Offer"
    url: string
    price: string
    priceCurrency: "USD"
    availability: "https://schema.org/InStock" | "https://schema.org/SoldOut"
  }
}

// Google's Product snippet: a name and an Offer with its price, currency and availability. `url` is the piece's
// current address, absolute.
export function productJsonLd(piece: ProductSummary, url: string, m: Messages = MESSAGES.en): ProductJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: piece.name,
    description: pieceDescription(piece, m),
    url,
    image: piece.images.map((image) => photoUrl(image, 1440)),
    material: piece.stoneType,
    color: piece.color,
    brand: { "@type": "Brand", name: "Glowstone" },
    offers: {
      "@type": "Offer",
      url,
      price: piece.price.toFixed(2),
      priceCurrency: "USD",
      availability: piece.soldOut ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
    },
  }
}

/** The shop itself, on the home page. */
export function storeJsonLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: "Glowstone",
    url: `${siteUrl}/`,
    logo: `${siteUrl}/brand/glowstone-monogram.svg`,
    email: CONTACT_EMAIL,
    areaServed: { "@type": "Country", name: "Lebanon" },
  }
}
