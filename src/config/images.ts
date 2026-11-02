// The scene composite (D12, 1376px, never upscaled): the home hero shows the first piece's cover now (2026-11-02), so
// this is only the source of the shop's default link preview (src/lib/og-images.ts).
export const HERO_IMAGES = {
  desktop: { key: "hero/desktop", widths: [480, 960, 1376], width: 1376, height: 768 },
  mobile: { key: "hero/mobile", widths: [480, 768], width: 768, height: 1376 },
} as const

// Craft close-ups get a 2880px variant (scripts/image-map.ts). Sizes are those of that variant.
export const CRAFT_IMAGES = {
  // The crest close-up is Arz (camera file _ADY1294, from the arz folder): its alt text names the piece from the data.
  crest: { key: "craft/crest", width: 2880, height: 4317, pieceId: 1 },
  bore: { key: "craft/bore", width: 2880, height: 1921 },
  boreThrough: { key: "craft/bore-through", width: 2880, height: 1921 },
  notch: { key: "craft/notch", width: 2880, height: 4318 },
} as const
