import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { BRAND_ICON, ICON_LINKS, SITE_LOGO } from "../src/config/icons.ts"

// Omar's 2026 S icon (Rami, 2026-11-03): the tab icons, the manifest, Google's logo and the small marks on the pages.
// The starter's purple bolt (favicon.svg) and the old slab monogram are gone for good.
const PUBLIC = "public"
const png = (path: string) => {
  const data = readFileSync(join(PUBLIC, path))
  expect(data.subarray(1, 4).toString()).toBe("PNG")
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) }
}

describe("the site's icons", () => {
  it("has a file of the stated size behind every icon link", () => {
    for (const link of ICON_LINKS) {
      expect(existsSync(join(PUBLIC, link.href)), link.href).toBe(true)
      if (link.href.endsWith(".png")) {
        const [w, h] = link.sizes!.split("x").map(Number)
        expect(png(link.href), link.href).toEqual({ width: w, height: h })
      }
    }
    expect(ICON_LINKS.map((link) => link.href)).toEqual(["/favicon.ico", "/favicon-48.png", "/favicon-96.png", "/apple-touch-icon.png", "/site.webmanifest"])
  })

  it("gives the .ico the 16, 32 and 48 px images", () => {
    const ico = readFileSync(join(PUBLIC, "favicon.ico"))
    expect(ico.readUInt16LE(2)).toBe(1)
    const count = ico.readUInt16LE(4)
    const sizes = Array.from({ length: count }, (_, i) => ico.readUInt8(6 + 16 * i))
    expect(sizes).toEqual([16, 32, 48])
    expect(ICON_LINKS[0].sizes).toBe("16x16 32x32 48x48")
  })

  it("names the shop in the manifest, on Soft Bone, with 192 and 512 px icons", () => {
    const manifest = JSON.parse(readFileSync(join(PUBLIC, "site.webmanifest"), "utf8")) as {
      name: string
      background_color: string
      icons: { src: string; sizes: string; type: string }[]
    }
    expect(manifest.name).toBe("Glowstone")
    expect(manifest.background_color).toBe("#eee6dd")
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual(["192x192", "512x512"])
    for (const icon of manifest.icons) {
      const [w, h] = icon.sizes.split("x").map(Number)
      expect(icon.type).toBe("image/png")
      expect(png(icon.src)).toEqual({ width: w, height: h })
    }
  })

  it("gives Google a square logo of at least 512 px", () => {
    const { width, height } = png(SITE_LOGO)
    expect(width).toBe(height)
    expect(width).toBeGreaterThanOrEqual(512)
  })

  it("has the dark and the white S for the pages, at the stated size", () => {
    for (const path of [BRAND_ICON.onLight, BRAND_ICON.onDark]) {
      const data = readFileSync(join(PUBLIC, path))
      expect(data.subarray(8, 12).toString(), path).toBe("WEBP")
      // VP8L (lossless): width-1 and height-1 packed in 14 bits each after the signature byte.
      const bits = data.readUInt32LE(21)
      expect({ width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }, path).toEqual({ width: BRAND_ICON.width, height: BRAND_ICON.height })
    }
  })

  it("never points at the purple favicon or the old monogram again", () => {
    expect(existsSync(join(PUBLIC, "favicon.svg"))).toBe(false)
    expect(readdirSync(join(PUBLIC, "brand")).filter((file) => file.includes("monogram"))).toEqual([])
    const files = ["index.html", "vercel.json", "react-router.config.ts", ...["src", "scripts", PUBLIC].flatMap((dir) => readdirSync(dir, { recursive: true, encoding: "utf8" }).map((file) => join(dir, file)))]
    const hits = files
      .filter((file) => existsSync(file) && statSync(file).isFile() && /\.(tsx?|json|html|css|svg|webmanifest|md)$/.test(file))
      .filter((file) => /favicon\.svg|glowstone-monogram/.test(readFileSync(file, "utf8")))
    expect(hits).toEqual([])
  })
})
