import { existsSync } from "node:fs"
import sharp from "sharp"
import { describe, expect, it } from "vitest"
import { CRAFT_IMAGES, HERO_IMAGES, HOME_IMAGES } from "../src/config/images.ts"

// The sizes in src/config/images.ts must match the generated files, or the browser reserves the wrong space.
describe("generated images", () => {
  it.each(Object.values(HERO_IMAGES))("has every hero variant of $key at its real size", async ({ key, widths, width, height }) => {
    for (const w of widths) expect(existsSync(`public/images/${key}-${w}.webp`), `${key}-${w}`).toBe(true)
    expect(Math.max(...widths)).toBe(width)
    const meta = await sharp(`public/images/${key}-${width}.webp`).metadata()
    expect([meta.width, meta.height]).toEqual([width, height])
  })

  // Qadisha's spotlight photos, copied from its product photos so deleting one in the studio can't break the home page.
  it.each(Object.values(HOME_IMAGES))("has every home variant of $key at its real size", async ({ key, width, height }) => {
    // Every width Picture offers for a bundled image up to 2880 (IMAGE_WIDTHS in src/lib/images.ts).
    for (const w of [480, 960, 1440, 2048, 2880]) expect(existsSync(`public/images/${key}-${w}.webp`), `${key}-${w}`).toBe(true)
    const meta = await sharp(`public/images/${key}-${width}.webp`).metadata()
    expect([meta.width, meta.height]).toEqual([width, height])
  })

  it.each(Object.values(CRAFT_IMAGES))("records the real size of $key", async ({ key, width, height }) => {
    const meta = await sharp(`public/images/${key}-${width}.webp`).metadata()
    expect([meta.width, meta.height]).toEqual([width, height])
  })
})
