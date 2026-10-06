// Hero composites are 1376px for now (D12: edit and upscale later). Never upscaled: the largest variant is the original.
export const HERO_IMAGES = {
  desktop: { key: "hero/desktop", widths: [480, 960, 1376], width: 1376, height: 768 },
  mobile: { key: "hero/mobile", widths: [480, 768], width: 768, height: 1376 },
} as const

// Craft close-ups get a 2880px variant (scripts/image-map.ts). Sizes are those of that variant.
export const CRAFT_IMAGES = {
  crest: { key: "craft/crest", width: 2880, height: 4317 },
  bore: { key: "craft/bore", width: 2880, height: 1921 },
  boreThrough: { key: "craft/bore-through", width: 2880, height: 1921 },
  notch: { key: "craft/notch", width: 2880, height: 4318 },
} as const
