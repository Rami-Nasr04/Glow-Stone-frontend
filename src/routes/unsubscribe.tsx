import { toLocale } from "@/i18n/locales"
import { MESSAGES } from "@/i18n/useLocale"
import Unsubscribe from "@/pages/Unsubscribe"
import type { Route } from "./+types/unsubscribe"

// Never indexed, never prerendered (its link carries a token): the app shell answers it, like sign-in.
export function meta({ params }: Route.MetaArgs) {
  return [{ title: MESSAGES[toLocale(params.lang)].unsubscribe.metaTitle }, { name: "robots", content: "noindex" }]
}

export default Unsubscribe
