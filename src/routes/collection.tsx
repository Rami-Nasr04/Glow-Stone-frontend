import { toLocale } from "@/i18n/locales"
import { localizedPath } from "@/i18n/paths"
import { MESSAGES } from "@/i18n/useLocale"
import { pageMeta } from "@/lib/meta"
import Collection from "@/pages/Collection"
import type { Route } from "./+types/collection"

export function meta({ params }: Route.MetaArgs) {
  const locale = toLocale(params.lang)
  const m = MESSAGES[locale]
  return pageMeta({ title: m.collection.metaTitle, description: m.collection.metaDescription, path: localizedPath(locale, "/collection") })
}

export default Collection
