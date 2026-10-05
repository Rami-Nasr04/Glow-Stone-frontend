import type { MetaDescriptor } from "react-router"
import { HERO_IMAGES } from "@/config/images"
import { SITE_URL } from "@/config/site"
import { imageUrl } from "@/lib/images"

interface PageMetaInput {
  title: string
  description: string
  /** Localized path of the page, e.g. "/collection/batroun". */
  path: string
  /** Image url from imageUrl(); defaults to the hero. */
  image?: string
}

const absolute = (url: string) => (/^https?:\/\//.test(url) ? url : `${SITE_URL}${url}`)

export function pageMeta({
  title,
  description,
  path,
  image = imageUrl(HERO_IMAGES.desktop.key, HERO_IMAGES.desktop.width),
}: PageMetaInput): MetaDescriptor[] {
  const url = absolute(path)
  return [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Glowstone" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:image", content: absolute(image) },
    { name: "twitter:card", content: "summary_large_image" },
    { tagName: "link", rel: "canonical", href: url },
  ]
}
