import type { MetaDescriptor } from "react-router"
import { SITE_URL } from "@/config/site"
import { OG_SIZE, SITE_OG } from "@/lib/og-paths"

interface PageMetaInput {
  title: string
  description: string
  /** Localized path of the page, e.g. "/collection/batroun". */
  path: string
  /** The link-preview image: one of the build's 1200×630 JPEGs (src/lib/og-paths.ts), the shop's own by default. */
  image?: string
}

const absolute = (url: string) => (/^https?:\/\//.test(url) ? url : `${SITE_URL}${url}`)

export function pageMeta({
  title,
  description,
  path,
  image = SITE_OG,
}: PageMetaInput): MetaDescriptor[] {
  const url = absolute(path)
  // The build writes these at 1200×630 as JPEG (src/lib/og-images.ts); any other image goes without a stated size.
  const ours = image.startsWith("/og/")
  return [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Glowstone" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:image", content: absolute(image) },
    ...(ours
      ? [
          { property: "og:image:width", content: String(OG_SIZE.width) },
          { property: "og:image:height", content: String(OG_SIZE.height) },
          { property: "og:image:type", content: "image/jpeg" },
        ]
      : []),
    { name: "twitter:card", content: "summary_large_image" },
    { tagName: "link", rel: "canonical", href: url },
  ]
}
