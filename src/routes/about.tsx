import { CRAFT_IMAGES } from "@/config/images"
import { toLocale } from "@/i18n/locales"
import { localizedPath } from "@/i18n/paths"
import { MESSAGES } from "@/i18n/useLocale"
import { imageUrl } from "@/lib/images"
import { pageMeta } from "@/lib/meta"
import About from "@/pages/About"
import type { Route } from "./+types/about"

export function meta({ params }: Route.MetaArgs) {
  const locale = toLocale(params.lang)
  const m = MESSAGES[locale]
  return pageMeta({
    title: m.about.metaTitle,
    description: m.about.metaDescription,
    path: localizedPath(locale, "/about"),
    image: imageUrl(CRAFT_IMAGES.crest.key, 1440),
  })
}

export default About
