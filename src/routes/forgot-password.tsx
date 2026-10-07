import { toLocale } from "@/i18n/locales"
import { MESSAGES } from "@/i18n/useLocale"
import type { RouteHandle } from "@/lib/route-handle"
import ForgotPassword from "@/pages/ForgotPassword"
import type { Route } from "./+types/forgot-password"

export const handle: RouteHandle = { bare: true }

export function meta({ params }: Route.MetaArgs) {
  return [{ title: MESSAGES[toLocale(params.lang)].auth.forgot.metaTitle }, { name: "robots", content: "noindex" }]
}

export default ForgotPassword
