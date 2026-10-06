import { toLocale } from "@/i18n/locales"
import { localizedPath } from "@/i18n/paths"
import { MESSAGES } from "@/i18n/useLocale"
import { pageMeta } from "@/lib/meta"
import Contact from "@/pages/Contact"
import type { Route } from "./+types/contact"

export function meta({ params }: Route.MetaArgs) {
  const locale = toLocale(params.lang)
  const m = MESSAGES[locale]
  return pageMeta({ title: m.contact.metaTitle, description: m.contact.metaDescription, path: localizedPath(locale, "/contact") })
}

export default Contact
