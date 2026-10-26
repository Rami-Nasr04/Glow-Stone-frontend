// robots.txt and sitemap.xml, written into the build by react-router.config.ts (Node-safe: no "@/" imports).

interface RobotsInput {
  /** VITE_ALLOW_INDEXING=true on a build with the shop. */
  indexing: boolean
  /** Absolute origin, without a trailing slash. */
  siteUrl: string
  /** The studio's path in a build of both parts (used by no project), kept out even when the shop is indexed. */
  studioBase: string | null
}

// Shut until launch; then open, with the sitemap. The studio's own project builds with indexing off, so it stays shut.
export function robotsTxt({ indexing, siteUrl, studioBase }: RobotsInput): string {
  if (!indexing) return "User-agent: *\nDisallow: /\n"
  const studio = studioBase ? `Disallow: ${studioBase}\n` : ""
  return `User-agent: *\nAllow: /\n${studio}\nSitemap: ${siteUrl}/sitemap.xml\n`
}

const escapeXml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;")

// Every page the build prerendered (home, collection, about, contact, the legal pages and every published piece), home
// first. Publish rebuilds the site, so the list follows the studio.
export function sitemapXml(siteUrl: string, paths: readonly string[]): string {
  const sorted = [...paths].sort((a, b) => (a === "/" ? -1 : b === "/" ? 1 : a.localeCompare(b)))
  const urls = sorted.map((path) => `  <url><loc>${escapeXml(`${siteUrl}${path}`)}</loc></url>`)
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...urls, "</urlset>", ""].join("\n")
}
