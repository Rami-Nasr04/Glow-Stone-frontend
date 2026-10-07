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

  it("prerenders every static page and every published piece, in the published locales only", async () => {
    const paths = await prerenderPaths()
    expect(paths.slice(0, 4)).toEqual(["/", "/collection", "/about", "/contact"])
    expect(paths.filter((p) => p.startsWith("/collection/"))).toEqual([
      "/collection/sannine-sand",
      "/collection/sannine-ash",
      "/collection/qadisha-earth",
      "/collection/qadisha-ash",
      "/collection/byblos",
      "/collection/batroun",
      "/collection/nahr",
      "/collection/arz",
    ])
    expect(paths).toEqual(expect.arrayContaining(["/legal/terms", "/legal/privacy", "/legal/delivery"]))
    expect(paths.some((p) => p.startsWith("/ar"))).toBe(false)
  })

  it("never prerenders the private account and sign-in pages", async () => {
    const paths = await prerenderPaths()
    for (const page of ["/sign-in", "/sign-up", "/verify", "/forgot-password", "/account"]) expect(paths).not.toContain(page)
  })
})
