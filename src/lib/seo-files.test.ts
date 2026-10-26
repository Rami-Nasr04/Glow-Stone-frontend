import { robotsTxt, sitemapXml } from "./seo-files"

describe("robots.txt", () => {
  it("shuts every crawler out while indexing is off", () => {
    expect(robotsTxt({ indexing: false, siteUrl: "https://glowstonelb.com", studioBase: null })).toBe("User-agent: *\nDisallow: /\n")
  })

  it("lets every crawler in and points to the sitemap once indexing is on", () => {
    expect(robotsTxt({ indexing: true, siteUrl: "https://glowstonelb.com", studioBase: null })).toBe(
      "User-agent: *\nAllow: /\n\nSitemap: https://glowstonelb.com/sitemap.xml\n",
    )
  })

  // A build of both parts (used by no project) keeps its studio out even when the shop is indexed.
  it("keeps a studio under a path out", () => {
    expect(robotsTxt({ indexing: true, siteUrl: "https://site.test", studioBase: "/studio" })).toBe(
      "User-agent: *\nAllow: /\nDisallow: /studio\n\nSitemap: https://site.test/sitemap.xml\n",
    )
  })
})

describe("sitemap.xml", () => {
  it("lists every page given, home first, as absolute addresses", () => {
    const xml = sitemapXml("https://glowstonelb.com", ["/collection/5/qadisha", "/about", "/", "/collection"])
    expect(xml).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        "  <url><loc>https://glowstonelb.com/</loc></url>",
        "  <url><loc>https://glowstonelb.com/about</loc></url>",
        "  <url><loc>https://glowstonelb.com/collection</loc></url>",
        "  <url><loc>https://glowstonelb.com/collection/5/qadisha</loc></url>",
        "</urlset>",
        "",
      ].join("\n"),
    )
  })

  it("escapes what XML can't carry as is", () => {
    expect(sitemapXml("https://site.test", ["/a&b"])).toContain("<loc>https://site.test/a&amp;b</loc>")
  })
})
