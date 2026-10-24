import { useState } from "react"
import { Navigate, useLocation } from "react-router"
import { useLocale } from "@/i18n/useLocale"
import { useAuth } from "./auth-context"

interface RequireAuthProps {
  children: React.ReactNode
}

// Account pages: wait for the saved session, then show the page or send the visitor to sign in and back.
// A customer who signs out on the page (its Sign out button) gets nothing here: the button takes them home or to sign
// in. A redirect from here would win, because React renders the sign-out before the router's navigation.
export default function RequireAuth({ children }: RequireAuthProps) {
  const { status } = useAuth()
  const { m, to } = useLocale()
  const { pathname, search } = useLocation()
  const [shown, setShown] = useState(false)
  if (status === "signedIn" && !shown) setShown(true)
  if (status === "loading") {
    return (
      <p role="status" className="sr-only">
        {m.auth.checking}
      </p>
    )
  }
  if (status === "signedOut" && shown) return null
  if (status === "signedOut") return <Navigate replace to={`${to("/sign-in")}?next=${encodeURIComponent(pathname + search)}`} />
  return children
}
