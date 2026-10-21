import { links } from "./root"

describe("root links", () => {
  // The fonts are found only once the stylesheet has arrived; these two set the text on every page, so they start with it.
  it("preloads the Latin Jost and Cormorant 300 fonts", () => {
    const preloads = links()
    expect(preloads).toHaveLength(2)
    expect(preloads.map((link) => "href" in link && link.href)).toEqual([
      expect.stringMatching(/jost-latin-wght-normal.*\.woff2$/),
      expect.stringMatching(/cormorant-garamond-latin-300-normal.*\.woff2$/),
    ])
    for (const link of preloads) expect(link).toMatchObject({ rel: "preload", as: "font", type: "font/woff2", crossOrigin: "anonymous" })
  })
})
