// Which original photo (by camera file id) becomes which site image key.
// Product folder names are the provisional F2 names; src/features/catalog/bundled-photos.ts maps them to the real
// pieces. The photos move to the API with the backend's product_images slice.
export const IMAGE_MAP: Record<string, string> = {
  "products/sannine-sand/1": "_ADY9990",
  "products/sannine-sand/2": "_ADY0001",
  "products/sannine-sand/3": "_ADY9896",
  "products/sannine-sand/4": "_ADY0010",
  "products/sannine-ash/1": "_ADY1222",
  "products/sannine-ash/2": "_ADY1179",
  "products/sannine-ash/3": "_ADY1299",
  "products/qadisha-earth/1": "_ADY0079",
  "products/qadisha-earth/2": "_ADY0123",
  "products/qadisha-earth/3": "_ADY0152",
  "products/qadisha-ash/1": "_ADY1345",
  "products/qadisha-ash/2": "_ADY1411",
  "products/byblos/1": "_ADY1075",
  "products/byblos/2": "_ADY0171",
  "products/byblos/3": "_ADY0220",
  "products/byblos/4": "_ADY0372",
  "products/batroun/1": "_ADY0488",
  "products/batroun/2": "_ADY0452",
  "products/batroun/3": "_ADY9884",
  "products/batroun/4": "_ADY0523",
  "products/nahr/1": "_ADY0967",
  "products/nahr/2": "_ADY1547",
  "products/nahr/3": "_ADY0900",
  "products/nahr/4": "_ADY0444",
  "products/arz/1": "_ADY0627",
  "products/arz/2": "_ADY0781",
  "products/arz/3": "_ADY0256",
  "products/arz/4": "_ADY0229",
  "products/arz/5": "_ADY0742",
  "craft/bore": "_ADY0044",
  "craft/bore-through": "_ADY0050",
  "craft/crest": "_ADY1294",
  "craft/notch": "_ADY0518",
}

const PRODUCT_WIDTHS = [480, 960, 1440, 2048] as const
// Craft photos run full-width (home collage, About), so they also get a 2880px variant for large retina screens.
const CRAFT_WIDTHS = [...PRODUCT_WIDTHS, 2880] as const

export function widthsFor(key: string): readonly number[] {
  return key.startsWith("craft/") ? CRAFT_WIDTHS : PRODUCT_WIDTHS
}

// Edited hero composites (not camera originals), generated with: node scripts/build-images.ts --hero "<folder>".
// Widths must match src/config/images.ts (tests/images.test.ts checks the files).
export const HERO_MAP: Record<string, { file: string; widths: readonly number[] }> = {
  "hero/desktop": { file: "hero desktop.png", widths: [480, 960, 1376] },
  "hero/mobile": { file: "hero mobile.png", widths: [480, 768] },
}

// WebP quality: high enough to keep chisel marks and stone grain crisp.
export const WEBP_QUALITY = 82
