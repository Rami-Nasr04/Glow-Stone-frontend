import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import sharp from "sharp"
import { ABOUT_OG, productOgPath, SITE_OG, writeOgImages } from "./og-images"

const COVER = "https://cdn.test/products/5/abc123"
const piece = (id: number, url: string | null) => ({ id, images: url ? [{ url, width: 2880, height: 4318 }] : [] })

describe("link-preview images", () => {
  it("names a piece's image after its cover, and none without photos", () => {
    expect(productOgPath(piece(5, COVER))).toBe("/og/products/5-abc123.jpg")
    expect(productOgPath(piece(5, null))).toBeNull()
  })

  describe("written by the build", () => {
    let client: string
    beforeEach(async () => {
      client = join(mkdtempSync(join(tmpdir(), "og-")), "client")
      mkdirSync(join(client, "images", "hero"), { recursive: true })
      mkdirSync(join(client, "images", "craft"), { recursive: true })
      const photo = (width: number, height: number) => sharp({ create: { width, height, channels: 3, background: "#806040" } }).webp().toBuffer()
      await sharp(await photo(1376, 768)).toFile(join(client, "images", "hero", "desktop-1376.webp"))
      await sharp(await photo(1440, 2159)).toFile(join(client, "images", "craft", "crest-1440.webp"))
    })
    afterEach(() => rmSync(join(client, ".."), { recursive: true, force: true }))

    const size = async (path: string) => {
      const { width, height, format } = await sharp(readFileSync(join(client, path))).metadata()
      return { width, height, format }
    }

    it("writes the shop's, the About page's and each piece's as 1200×630 JPEGs, the piece whole on its photo's own backdrop", async () => {
      // A dark portrait with a red band along its top and a pale piece in the middle: shown whole, the band stays in the
      // frame, and the sides take the dark backdrop, not the photo's overall colour.
      const band = await sharp({ create: { width: 1440, height: 60, channels: 3, background: "#ff0000" } }).png().toBuffer()
      const stone = await sharp({ create: { width: 900, height: 1500, channels: 3, background: "#e0dcd0" } }).png().toBuffer()
      const portrait = await sharp({ create: { width: 1440, height: 2160, channels: 3, background: "#203040" } })
        .composite([
          { input: band, top: 0, left: 0 },
          { input: stone, top: 330, left: 270 },
        ])
        .webp()
        .toBuffer()
      const fetch = vi.fn(async () => new Response(new Uint8Array(portrait)))
      await writeOgImages(client, [piece(5, COVER), piece(6, null)], fetch)
      for (const path of [SITE_OG, ABOUT_OG, "/og/products/5-abc123.jpg"]) expect(await size(path)).toEqual({ width: 1200, height: 630, format: "jpeg" })
      expect(fetch).toHaveBeenCalledWith(`${COVER}/1440.webp`)
      const { data, info } = await sharp(readFileSync(join(client, "og/products/5-abc123.jpg"))).raw().toBuffer({ resolveWithObject: true })
      const pixel = (x: number, y: number) => [...data.subarray((y * info.width + x) * 3, (y * info.width + x) * 3 + 3)].map((v) => Math.round(v / 16))
      // Contained, not cropped: the band is still there at the top, and the sides carry the photo's backdrop.
      expect(pixel(600, 4)).toEqual([0xff, 0, 0].map((v) => Math.round(v / 16)))
      expect(pixel(5, 315)).toEqual([0x20, 0x30, 0x40].map((v) => Math.round(v / 16)))
    })

    it("still answers a piece's address with the shop's image when its photo can't be fetched", async () => {
      await writeOgImages(client, [piece(5, COVER)], vi.fn(async () => new Response("no", { status: 503 })))
      expect(readFileSync(join(client, "og/products/5-abc123.jpg"))).toEqual(readFileSync(join(client, SITE_OG)))
    })
  })
})
