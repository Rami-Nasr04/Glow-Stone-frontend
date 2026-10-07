import { toLocale } from "@/i18n/locales"
import { MESSAGES } from "@/i18n/useLocale"
import type { RouteHandle } from "@/lib/route-handle"
import Verify from "@/pages/Verify"
import type { Route } from "./+types/verify"

export const handle: RouteHandle = { bare: true }

export function meta({ params }: Route.MetaArgs) {
  return [{ title: MESSAGES[toLocale(params.lang)].auth.verify.metaTitle }, { name: "robots", content: "noindex" }]
}

export default Verify
