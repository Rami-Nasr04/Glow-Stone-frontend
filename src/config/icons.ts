// Omar's 2026 identity (Rami, 2026-11-03): his dark S icon on a Soft Bone tile for the tabs, the home screen and Google's
// results; the S alone, dark or white, for the small marks on the pages. Files made from his 2480 px PNGs.
export const ICON_LINKS: readonly { rel: string; href: string; type?: string; sizes?: string }[] = [
  { rel: "icon", href: "/favicon.ico", sizes: "16x16 32x32 48x48" },
  // Google's results use a square of a multiple of 48 px.
  { rel: "icon", type: "image/png", href: "/favicon-48.png", sizes: "48x48" },
  { rel: "icon", type: "image/png", href: "/favicon-96.png", sizes: "96x96" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
  { rel: "manifest", href: "/site.webmanifest" },
]

// The S, trimmed to its stone (taller than wide): set its height, the width follows. 3x the tallest spot (the 404).
export const BRAND_ICON = {
  onLight: "/brand/glowstone-icon.webp",
  onDark: "/brand/glowstone-icon-on-dark.webp",
  width: 117,
  height: 264,
} as const

// The OnlineStore's logo for Google: the S on white, square.
export const SITE_LOGO = "/brand/glowstone-logo-512.png"
