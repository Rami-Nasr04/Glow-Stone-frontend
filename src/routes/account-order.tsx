import { ACCOUNTS_OPEN } from "@/features/auth/client"
import RequireAuth from "@/features/auth/RequireAuth"
import { toLocale } from "@/i18n/locales"
import { MESSAGES } from "@/i18n/useLocale"
import NotFound from "@/pages/NotFound"
import AccountOrder from "@/pages/AccountOrder"
import type { Route } from "./+types/account-order"

// Closed on built sites until VITE_ACCOUNTS_OPEN=true (like the sign-in pages): the missing page, in the site frame.
export function meta({ params }: Route.MetaArgs) {
  const m = MESSAGES[toLocale(params.lang)]
  return [{ title: ACCOUNTS_OPEN ? m.orders.accountMetaTitle : m.notFound.metaTitle }, { name: "robots", content: "noindex" }]
}

function Page() {
  return (
    <RequireAuth>
      <AccountOrder />
    </RequireAuth>
  )
}

export default ACCOUNTS_OPEN ? Page : NotFound
