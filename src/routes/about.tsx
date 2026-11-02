// Amiri, subset to Arabic, for Omar's own words: loaded with this page only (font-display: swap).
import "@fontsource/amiri/arabic-400.css"
import { toLocale } from "@/i18n/locales"
import { localizedPath } from "@/i18n/paths"
import { MESSAGES } from "@/i18n/useLocale"
import { pageMeta } from "@/lib/meta"
import { ABOUT_OG } from "@/lib/og-paths"
import About from "@/pages/About"
import type { Route } from "./+types/about"

// No data: since the Qadisha Valley took the chapter on the stone (Rami, 2026-11-02), nothing here names a piece.
export function meta({ params }: Route.MetaArgs) {
  const locale = toLocale(params.lang)
  const m = MESSAGES[locale]
  return pageMeta({
    title: m.about.metaTitle,
    description: m.about.metaDescription,
    path: localizedPath(locale, "/about"),
    image: ABOUT_OG,
  })
}

export default About
