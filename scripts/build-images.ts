// Generates responsive WebP variants for every mapped photo.
// Usage: node scripts/build-images.ts "<folder with the original _ADY*.jpg files>"
// Output: public/images/<key>-<width>.webp (never upscaled; EXIF orientation applied).
import { existsSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import sharp from "sharp"
import { IMAGE_MAP, WEBP_QUALITY, widthsFor } from "./image-map.ts"

const sourceDir = process.argv[2]
if (!sourceDir || !existsSync(sourceDir)) {
  console.error("Pass the folder that contains the original photos.")
  process.exit(1)
}

let written = 0
for (const [key, id] of Object.entries(IMAGE_MAP)) {
  const source = join(sourceDir, `${id}.jpg`)
  if (!existsSync(source)) {
    console.error(`Missing original for ${key}: ${source}`)
    process.exitCode = 1
    continue
  }
  const { width: original = 0 } = await sharp(source).rotate().toBuffer({ resolveWithObject: true }).then((r) => r.info)
  for (const width of widthsFor(key)) {
    if (width > original) continue
    const out = join("public", "images", `${key}-${width}.webp`)
    mkdirSync(dirname(out), { recursive: true })
    await sharp(source).rotate().resize({ width }).webp({ quality: WEBP_QUALITY }).toFile(out)
    written++
  }
  console.info(`✓ ${key}`)
}
console.info(`${written} files written to public/images`)
