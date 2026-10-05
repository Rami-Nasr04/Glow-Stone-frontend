import { existsSync } from "node:fs"
import sharp from "sharp"
import { describe, expect, it } from "vitest"
import { CRAFT_IMAGES, HERO_IMAGES } from "../src/config/images.ts"

// The sizes in src/config/images.ts must match the generated files, or the browser reserves the wrong space.
describe("generated images", () => {
  it.each(Object.values(HERO_IMAGES))("has every hero variant of $key at its real size", async ({ key, widths, width, height }) => {
    for (const w of widths) expect(existsSync(`public/images/${key}-${w}.webp`), `${key}-${w}`).toBe(true)
    expect(Math.max(...widths)).toBe(width)
    const meta = await sharp(`public/images/${key}-${width}.webp`).metadata()
    expect([meta.width, meta.height]).toEqual([width, height])
  })

  it.each(Object.values(CRAFT_IMAGES))("records the real size of $key", async ({ key, width, height }) => {
    const meta = await sharp(`public/images/${key}-${width}.webp`).metadata()
    expect([meta.width, meta.height]).toEqual([width, height])
  })
})
