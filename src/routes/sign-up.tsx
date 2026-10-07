import { toLocale } from "@/i18n/locales"
import { MESSAGES } from "@/i18n/useLocale"
import type { RouteHandle } from "@/lib/route-handle"
import SignUp from "@/pages/SignUp"
import type { Route } from "./+types/sign-up"

export const handle: RouteHandle = { bare: true }

export function meta({ params }: Route.MetaArgs) {
  return [{ title: MESSAGES[toLocale(params.lang)].auth.signUp.metaTitle }, { name: "robots", content: "noindex" }]
}

export default SignUp
