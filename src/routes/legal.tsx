import { isLegalDoc } from "@/components/legal/docs"
import { interpolate } from "@/i18n/format"
import { toLocale } from "@/i18n/locales"
import { localizedPath } from "@/i18n/paths"
import { MESSAGES } from "@/i18n/useLocale"
import { pageMeta } from "@/lib/meta"
import Legal from "@/pages/Legal"
import type { Route } from "./+types/legal"

export function meta({ params }: Route.MetaArgs) {
  const locale = toLocale(params.lang)
  const m = MESSAGES[locale]
  if (!isLegalDoc(params.doc)) return [{ title: m.notFound.metaTitle }, { name: "robots", content: "noindex" }]
  const { title } = m.legal.docs[params.doc]
  return pageMeta({
    title: `${title} — Glowstone`,
    description: interpolate(m.legal.metaDescription, { title }),
    path: localizedPath(locale, `/legal/${params.doc}`),
  })
}

export default Legal
