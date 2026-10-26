import { pageMeta } from "./meta"

const find = (meta: ReturnType<typeof pageMeta>, key: string) =>
  meta.find((d) => ("property" in d && d.property === key) || ("name" in d && d.name === key))

describe("pageMeta", () => {
  it("sets the title, description and an absolute canonical url", () => {
    const meta = pageMeta({ title: "About — Glowstone", description: "Omar, and the patience of stone.", path: "/about" })
    expect(meta).toContainEqual({ title: "About — Glowstone" })
    expect(find(meta, "description")).toMatchObject({ content: "Omar, and the patience of stone." })
    expect(meta).toContainEqual({ tagName: "link", rel: "canonical", href: "https://site.test/about" })
  })

  // WhatsApp and Instagram previews want a JPEG of about 1200×630; the build writes them (Rami, 2026-10-26).
  it("gives link previews an absolute 1200×630 JPEG, defaulting to the shop's own", () => {
    const meta = pageMeta({ title: "Glowstone", description: "x", path: "/" })
    expect(find(meta, "og:image")).toMatchObject({ content: "https://site.test/og/glowstone.jpg" })
    expect(find(meta, "og:image:width")).toMatchObject({ content: "1200" })
    expect(find(meta, "og:image:height")).toMatchObject({ content: "630" })
    expect(find(meta, "og:image:type")).toMatchObject({ content: "image/jpeg" })
    expect(find(meta, "twitter:card")).toMatchObject({ content: "summary_large_image" })
  })

  it("keeps image urls that are already absolute (CloudFront from B6)", () => {
    const meta = pageMeta({ title: "t", description: "d", path: "/", image: "https://cdn.example.com/a.webp" })
    expect(find(meta, "og:image")).toMatchObject({ content: "https://cdn.example.com/a.webp" })
  })
})
