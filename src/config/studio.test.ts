import { safeStudioNext, STUDIO_BASE, studioPath } from "./studio"

describe("studio addresses", () => {
  it("live under one base, /studio until the studio moves to its own subdomain", () => {
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
