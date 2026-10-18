import { readSiteParts, readStudioBase, safeStudioNext, SITE_PARTS, STUDIO_BASE, shopHref, studioPath } from "./studio"

describe("studio addresses", () => {
  it("live under one base, /studio when it is unset (local development)", () => {
    expect(STUDIO_BASE).toBe("/studio")
    expect(studioPath("/products/7")).toBe("/studio/products/7")
    expect(studioPath("/")).toBe("/studio")
  })

  it("move with the base, so the subdomain needs only config", () => {
    expect(studioPath("/products/7", "/")).toBe("/products/7")
    expect(studioPath("/", "/")).toBe("/")
    expect(studioPath("/sign-in", "/admin")).toBe("/admin/sign-in")
  })

  it("send the admin back only to a studio page after signing in", () => {
    const fallback = "/studio/products"
    expect(safeStudioNext("/studio/products/5?tab=1", "/studio")).toBe("/studio/products/5?tab=1")
    expect(safeStudioNext("/studio", "/studio")).toBe("/studio")
    for (const raw of [null, "", "/collection", "/studio-evil", "//evil.com/studio", "https://evil.com/studio/products", "/studio/sign-in?next=/x", "/studio/forgot-password"]) {
      expect(safeStudioNext(raw, "/studio")).toBe(fallback)
    }
    expect(safeStudioNext("/products/5", "/")).toBe("/products/5")
    expect(safeStudioNext("/sign-in", "/")).toBe("/products")
  })
})

// The domain step (launch checklist): the shop's project builds "shop", a second project builds "studio" at its root.
describe("the site's parts", () => {
  it("are both, with the studio under /studio, when nothing is set (today's single project)", () => {
    expect(readSiteParts(undefined)).toEqual(["shop", "studio"])
    expect(readSiteParts(" ")).toEqual(["shop", "studio"])
    expect(readStudioBase(undefined, ["shop", "studio"])).toBe("/studio")
    expect(SITE_PARTS).toEqual(["shop", "studio"])
    expect(STUDIO_BASE).toBe("/studio")
  })

  it("can be the shop alone or the studio alone", () => {
    expect(readSiteParts("shop")).toEqual(["shop"])
    expect(readSiteParts("studio")).toEqual(["studio"])
    expect(readStudioBase("/", ["studio"])).toBe("/")
  })

  it("stop the build on a value that would leave a broken site", () => {
    expect(() => readSiteParts("both")).toThrow('VITE_SITE_PARTS must be "shop" or "studio"')
    expect(() => readStudioBase("studio", ["shop", "studio"])).toThrow("VITE_STUDIO_BASE must be")
    expect(() => readStudioBase("/studio/", ["shop", "studio"])).toThrow("VITE_STUDIO_BASE must be")
    expect(() => readStudioBase(undefined, ["studio"])).toThrow("set VITE_STUDIO_BASE=/")
    expect(() => readStudioBase("/", ["shop", "studio"])).toThrow("can't take the root")
  })

  it("send the studio's shop link to the shop's own address when the shop isn't in this build", () => {
    expect(shopHref(["shop", "studio"], "https://shop.test")).toBe("/")
    expect(shopHref(["studio"], "https://shop.test")).toBe("https://shop.test/")
  })
})
