import { ACCOUNTS_OPEN } from "@/features/auth/client"
import { toLocale } from "@/i18n/locales"
import { MESSAGES } from "@/i18n/useLocale"
import type { RouteHandle } from "@/lib/route-handle"
import NotFound from "@/pages/NotFound"
import Verify from "@/pages/Verify"
import type { Route } from "./+types/verify"

// Closed on built sites until VITE_ACCOUNTS_OPEN=true: the missing page, inside the site frame.
export const handle: RouteHandle = { bare: ACCOUNTS_OPEN }

export function meta({ params }: Route.MetaArgs) {
  const m = MESSAGES[toLocale(params.lang)]
  return [{ title: ACCOUNTS_OPEN ? m.auth.verify.metaTitle : m.notFound.metaTitle }, { name: "robots", content: "noindex" }]
}

export default ACCOUNTS_OPEN ? Verify : NotFound
