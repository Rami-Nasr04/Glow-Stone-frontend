import { ACCOUNTS_OPEN } from "@/features/auth/client"
import { toLocale } from "@/i18n/locales"
import { MESSAGES } from "@/i18n/useLocale"
import type { RouteHandle } from "@/lib/route-handle"
import NotFound from "@/pages/NotFound"
import ForgotPassword from "@/pages/ForgotPassword"
import type { Route } from "./+types/forgot-password"

// Closed on built sites until the customer pool is live: the missing page, inside the site frame.
export const handle: RouteHandle = { bare: ACCOUNTS_OPEN }

export function meta({ params }: Route.MetaArgs) {
  const m = MESSAGES[toLocale(params.lang)]
  return [{ title: ACCOUNTS_OPEN ? m.auth.forgot.metaTitle : m.notFound.metaTitle }, { name: "robots", content: "noindex" }]
}

export default ACCOUNTS_OPEN ? ForgotPassword : NotFound
