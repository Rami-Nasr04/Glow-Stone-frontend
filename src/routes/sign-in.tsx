import { toLocale } from "@/i18n/locales"
import { MESSAGES } from "@/i18n/useLocale"
import type { RouteHandle } from "@/lib/route-handle"
import SignIn from "@/pages/SignIn"
import type { Route } from "./+types/sign-in"

export const handle: RouteHandle = { bare: true }

export function meta({ params }: Route.MetaArgs) {
  return [{ title: MESSAGES[toLocale(params.lang)].auth.signIn.metaTitle }, { name: "robots", content: "noindex" }]
}

export default SignIn
