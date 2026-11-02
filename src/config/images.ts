// Rami's hero scene (D12, 1376px, never upscaled), also the shop's default link preview (src/lib/og-images.ts).
export const HERO_IMAGES = {
  desktop: { key: "hero/desktop", widths: [480, 960, 1376], width: 1376, height: 768 },
  mobile: { key: "hero/mobile", widths: [480, 768], width: 768, height: 1376 },
} as const

// The piece in the hero scene: Tura (id 5, once Qadisha). The caption names it from the data, whatever Omar's order.
export const HERO_PIECE_ID = 5

// Photos by others, used under their licence and credited in the terms (scripts/image-map.ts, EXTERNAL_MAP).
export const ABOUT_IMAGES = {
  qadishaValley: {
    key: "about/qadisha-valley",
    width: 2880,
    height: 2159,
    page: "https://commons.wikimedia.org/wiki/File:Qadisha_Valley,_Aerial_View_From_Qannoubine_Monastery.jpg",
    licence: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
} as const

// Craft close-ups get a 2880px variant (scripts/image-map.ts). Sizes are those of that variant.
export const CRAFT_IMAGES = {
  // The crest close-up is Arz (camera file _ADY1294, from the arz folder): its alt text names the piece from the data.
  crest: { key: "craft/crest", width: 2880, height: 4317, pieceId: 1 },
  bore: { key: "craft/bore", width: 2880, height: 1921 },
  boreThrough: { key: "craft/bore-through", width: 2880, height: 1921 },
  notch: { key: "craft/notch", width: 2880, height: 4318 },
} as const
