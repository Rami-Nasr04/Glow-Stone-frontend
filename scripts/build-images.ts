// Generates responsive WebP variants.
// Usage: node scripts/build-images.ts "<folder with the original _ADY*.jpg files>"
//        node scripts/build-images.ts --hero "<folder with hero desktop.png and hero mobile.png>"
// Output: public/images/<key>-<width>.webp (never upscaled; EXIF orientation applied).
import { existsSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import sharp from "sharp"
import { CRAFT_WIDTHS, HERO_MAP, IMAGE_MAP, WEBP_QUALITY } from "./image-map.ts"

const heroMode = process.argv[2] === "--hero"
const sourceDir = heroMode ? process.argv[3] : process.argv[2]
if (!sourceDir || !existsSync(sourceDir)) {
  console.error("Pass the folder that contains the original photos.")
  process.exit(1)
}

const jobs = heroMode
  ? Object.entries(HERO_MAP).map(([key, { file, widths }]) => ({ key, source: join(sourceDir, file), widths }))
  : Object.entries(IMAGE_MAP).map(([key, id]) => ({ key, source: join(sourceDir, `${id}.jpg`), widths: CRAFT_WIDTHS }))

let written = 0
for (const { key, source, widths } of jobs) {
  if (!existsSync(source)) {
    console.error(`Missing original for ${key}: ${source}`)
    process.exitCode = 1
    continue
  }
  const { width: original = 0 } = await sharp(source).rotate().toBuffer({ resolveWithObject: true }).then((r) => r.info)
  for (const width of widths) {
    if (width > original) continue
    const out = join("public", "images", `${key}-${width}.webp`)
    mkdirSync(dirname(out), { recursive: true })
    await sharp(source).rotate().resize({ width }).webp({ quality: WEBP_QUALITY }).toFile(out)
    written++
  }
  console.info(`✓ ${key}`)
}
console.info(`${written} files written to public/images`)
