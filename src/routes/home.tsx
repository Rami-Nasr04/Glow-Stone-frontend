import { toLocale } from "@/i18n/locales"
import { localizedPath } from "@/i18n/paths"
import { MESSAGES } from "@/i18n/useLocale"
import { pageMeta } from "@/lib/meta"
import Home from "@/pages/Home"
import type { Route } from "./+types/home"

export function meta({ params }: Route.MetaArgs) {
  const locale = toLocale(params.lang)
  const m = MESSAGES[locale]
  return pageMeta({ title: m.home.metaTitle, description: m.home.metaDescription, path: localizedPath(locale, "/") })
}

export default Home
