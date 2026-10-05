import { pageMeta } from "./meta"

const find = (meta: ReturnType<typeof pageMeta>, key: string) =>
  meta.find((d) => ("property" in d && d.property === key) || ("name" in d && d.name === key))

describe("pageMeta", () => {
  it("sets the title, description and an absolute canonical url", () => {
    const meta = pageMeta({ title: "About — Glowstone", description: "Omar, and the patience of stone.", path: "/about" })
    expect(meta).toContainEqual({ title: "About — Glowstone" })
    expect(find(meta, "description")).toMatchObject({ content: "Omar, and the patience of stone." })
    expect(meta).toContainEqual({ tagName: "link", rel: "canonical", href: "https://glowstonelb.com/about" })
  })

  it("gives link previews an absolute image, defaulting to the hero", () => {
    const meta = pageMeta({ title: "Glowstone", description: "x", path: "/" })
    expect(find(meta, "og:image")).toMatchObject({ content: "https://glowstonelb.com/images/hero/desktop-1376.webp" })
    expect(find(meta, "twitter:card")).toMatchObject({ content: "summary_large_image" })
  })

  it("keeps image urls that are already absolute (CloudFront from B6)", () => {
    const meta = pageMeta({ title: "t", description: "d", path: "/", image: "https://cdn.example.com/a.webp" })
    expect(find(meta, "og:image")).toMatchObject({ content: "https://cdn.example.com/a.webp" })
  })
})
