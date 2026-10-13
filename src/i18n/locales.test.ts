import { directionOf, isLocale, toLocale } from "./locales"
import { PRODUCTS } from "@/test/catalog"
import { localizedPath, prerenderPaths } from "./paths"

describe("locales", () => {
  it("accepts only en, ar and fr", () => {
    expect(isLocale("ar")).toBe(true)
    expect(isLocale("de")).toBe(false)
    expect(isLocale(undefined)).toBe(false)
  })

  it("falls back to English for unknown or missing segments", () => {
    expect(toLocale("collection")).toBe("en")
    expect(toLocale(undefined)).toBe("en")
  })

  it("is right-to-left only for Arabic", () => {
    expect(directionOf("ar")).toBe("rtl")
    expect(directionOf("fr")).toBe("ltr")
  })
})

describe("localized paths", () => {
  it("keeps English unprefixed and prefixes the others", () => {
    expect(localizedPath("en", "/collection")).toBe("/collection")
    expect(localizedPath("ar", "/")).toBe("/ar")
    expect(localizedPath("fr", "/about")).toBe("/fr/about")
  })

  it("prerenders every static page and every published piece from GET /products, in the published locales only", () => {
    const paths = prerenderPaths(PRODUCTS)
    expect(paths.slice(0, 4)).toEqual(["/", "/collection", "/about", "/contact"])
    expect(paths.filter((p) => p.startsWith("/collection/"))).toEqual([
      "/collection/6/sannine",
      "/collection/5/qadisha",
      "/collection/4/jbeil",
      "/collection/3/batroun",
      "/collection/2/nahr",
      "/collection/1/arz",
    ])
    expect(paths).toEqual(expect.arrayContaining(["/legal/terms", "/legal/privacy", "/legal/delivery"]))
    expect(paths.some((p) => p.startsWith("/ar"))).toBe(false)
  })

  it("prerenders a renamed piece under its current name only", () => {
    const renamed = PRODUCTS.map((p) => (p.id === 5 ? { ...p, name: "Qadisha Valley" } : p))
    const paths = prerenderPaths(renamed)
    expect(paths).toContain("/collection/5/qadisha-valley")
    expect(paths).not.toContain("/collection/5/qadisha")
  })

  it("never prerenders the private account and sign-in pages", () => {
    const paths = prerenderPaths(PRODUCTS)
    for (const page of ["/sign-in", "/sign-up", "/verify", "/forgot-password", "/account"]) expect(paths).not.toContain(page)
  })
})
