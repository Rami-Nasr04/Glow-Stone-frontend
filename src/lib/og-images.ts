// The link-preview images WhatsApp, Instagram and search results show: 1200×630 JPEGs, written into the build by
// react-router.config.ts (Node only: it uses sharp). Publish rebuilds the site, so a piece's preview follows its cover.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import sharp from "sharp"
import { ABOUT_OG, OG_SIZE, productOgPath, SITE_OG } from "./og-paths.ts"

export { ABOUT_OG, productOgPath, SITE_OG } from "./og-paths.ts"


type Fetch = (url: string) => Promise<Response>

function write(client: string, path: string, data: Uint8Array) {
  const file = join(client, path)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, data)
}

// A bundled photo, cropped to fill the frame (the hero and the crest are scenes, not pieces).
const cropped = (source: string) => sharp(readFileSync(source)).resize({ ...OG_SIZE, fit: "cover" }).jpeg({ quality: 82 }).toBuffer()

// A piece is never cropped: its cover sits whole, widened with its own backdrop (the colour at the middle of its left
// edge), so a piece shot on black stays on black.
async function contained(photo: ArrayBuffer): Promise<Buffer> {
  const source = Buffer.from(photo)
  const { height = 1 } = await sharp(source).metadata()
  // stats() reads its own input, so the edge is cut out first.
  const strip = await sharp(source).extract({ left: 0, top: Math.floor(height / 2), width: 8, height: 8 }).png().toBuffer()
  const edge = await sharp(strip).stats()
  const [r, g, b] = edge.channels.map((channel) => Math.round(channel.mean))
  const background = { r, g, b }
  return sharp(source).resize({ ...OG_SIZE, fit: "contain", background }).flatten({ background }).jpeg({ quality: 82 }).toBuffer()
}

export async function writeOgImages(client: string, products: readonly { id: number; images: readonly { url: string }[] }[], fetchImpl: Fetch = fetch) {
  const site = await cropped(join(client, "images", "hero", "desktop-1376.webp"))
  write(client, SITE_OG, site)
  write(client, ABOUT_OG, await cropped(join(client, "images", "craft", "crest-1440.webp")))
  for (const piece of products) {
    const path = productOgPath(piece)
    if (!path) continue
    // A photo that can't be fetched leaves the shop's own image at the piece's address, so a preview never breaks.
    let image: Buffer = site
    try {
      const response = await fetchImpl(`${piece.images[0].url}/1440.webp`)
      if (!response.ok) throw new Error(`status ${response.status}`)
      image = await contained(await response.arrayBuffer())
    } catch (error) {
      console.warn(`Link preview of piece ${piece.id}: its cover couldn't be used (${String(error)}); the shop's image stands in.`)
    }
    write(client, path, image)
  }
}
