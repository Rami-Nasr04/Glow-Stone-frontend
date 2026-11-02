// Which original photo (by camera file id) becomes which bundled craft image. Product photos are not bundled: they
// come from the products API (Omar uploads them in the studio).
export const IMAGE_MAP: Record<string, string> = {
  "craft/bore": "_ADY0044",
  "craft/bore-through": "_ADY0050",
  "craft/crest": "_ADY1294",
  "craft/notch": "_ADY0518",
}

// Craft photos run full-width (home collage, About), so they also get a 2880px variant for large retina screens.
export const CRAFT_WIDTHS = [480, 960, 1440, 2048, 2880] as const

// Edited hero composites (not camera originals), generated with: node scripts/build-images.ts --hero "<folder>".
// Widths must match src/config/images.ts (tests/images.test.ts checks the files).
export const HERO_MAP: Record<string, { file: string; widths: readonly number[] }> = {
  "hero/desktop": { file: "hero desktop.png", widths: [480, 960, 1376] },
  "hero/mobile": { file: "hero mobile.png", widths: [480, 768] },
}

// Photos by other people, used under their licence (credited on the page), generated with:
// node scripts/build-images.ts --external "<folder with the downloaded originals>". Same widths as the craft photos.
export const EXTERNAL_MAP: Record<string, { file: string; source: string }> = {
  // Evan Williams, CC BY-SA 4.0, from Wikimedia Commons (the About page credits it under the photo).
  "about/qadisha-valley": {
    file: "Qadisha_Valley_Aerial_View_From_Qannoubine_Monastery.jpg",
    source: "https://commons.wikimedia.org/wiki/File:Qadisha_Valley,_Aerial_View_From_Qannoubine_Monastery.jpg",
  },
}

// WebP quality: high enough to keep chisel marks and stone grain crisp.
export const WEBP_QUALITY = 82
