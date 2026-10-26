import { productOf } from "@/test/catalog"
import { pieceDescription, productJsonLd, storeJsonLd } from "./structured-data"

const SITE = "https://site.test"

describe("a piece's description", () => {
  it("says what it is from the piece's own data, then its summary", () => {
    expect(pieceDescription({ ...productOf(5), name: "Sannine", bottles: 10, summary: "Tall column with five half-moon notches on each side." })).toBe(
      "Sannine: a hand-carved limestone wine rack for 10 bottles, made in Lebanon. Tall column with five half-moon notches on each side.",
    )
  })

  it("counts one bottle as one, and stops after the first sentence without a summary", () => {
    expect(pieceDescription({ ...productOf(5), name: "Arz", bottles: 1, summary: null })).toBe("Arz: a hand-carved limestone wine rack for 1 bottle, made in Lebanon.")
  })
})

describe("a piece's Product data for search engines", () => {
  const piece = productOf(5)
  const data = productJsonLd(piece, `${SITE}/collection/5/qadisha`)

  // Google's Product snippet needs a name and offers; an Offer needs a price, its currency and an availability.
  it("has what Google requires for a product with a price", () => {
    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Qadisha",
      url: `${SITE}/collection/5/qadisha`,
      brand: { "@type": "Brand", name: "Glowstone" },
      material: piece.stoneType,
      color: piece.color,
      offers: {
        "@type": "Offer",
        url: `${SITE}/collection/5/qadisha`,
        price: piece.price.toFixed(2),
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
    })
    expect(data.description).toBe(pieceDescription(piece))
  })

  it("lists every photo as an absolute address", () => {
    expect(data.image).toEqual(piece.images.map((image) => `${image.url}/1440.webp`))
    for (const url of data.image) expect(url).toMatch(/^https:\/\//)
  })

  it("says a sold-out piece is sold out", () => {
    expect(productJsonLd({ ...piece, remaining: 0, soldOut: true }, `${SITE}/x`).offers.availability).toBe("https://schema.org/SoldOut")
  })

  it("survives being written into the page as JSON", () => {
    expect(JSON.parse(JSON.stringify(data))).toEqual(data)
  })
})

describe("the shop's own data for search engines", () => {
  it("names the store, its address, logo, email and that it serves Lebanon", () => {
    expect(storeJsonLd(SITE)).toEqual({
      "@context": "https://schema.org",
      "@type": "OnlineStore",
      name: "Glowstone",
      url: `${SITE}/`,
      logo: `${SITE}/brand/glowstone-monogram.svg`,
      email: "hello@glowstonelb.com",
      areaServed: { "@type": "Country", name: "Lebanon" },
    })
  })
})
