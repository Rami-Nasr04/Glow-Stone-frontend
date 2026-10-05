import { directionOf, isLocale, toLocale } from "./locales"
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

  it("prerenders every static page in every locale", async () => {
    const paths = await prerenderPaths()
    expect(paths).toHaveLength(12)
    expect(paths).toContain("/ar/collection")
  })
})
