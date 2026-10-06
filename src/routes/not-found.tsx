import { toLocale } from "@/i18n/locales"
import { MESSAGES } from "@/i18n/useLocale"
import NotFound from "@/pages/NotFound"
import type { Route } from "./+types/not-found"

export function meta({ params }: Route.MetaArgs) {
  return [{ title: MESSAGES[toLocale(params.lang)].notFound.metaTitle }, { name: "robots", content: "noindex" }]
}

export default NotFound
