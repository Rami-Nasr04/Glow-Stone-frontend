import { Navigate, useLocation } from "react-router"
import { useLocale } from "@/i18n/useLocale"
import { useAuth } from "./auth-context"

interface RequireAuthProps {
  children: React.ReactNode
}

// Account pages: wait for the saved session, then show the page or send the visitor to sign in and back.
export default function RequireAuth({ children }: RequireAuthProps) {
  const { status } = useAuth()
  const { m, to } = useLocale()
  const { pathname, search } = useLocation()
  if (status === "loading") {
    return (
      <p role="status" className="sr-only">
        {m.auth.checking}
      </p>
    )
  }
  if (status === "signedOut") return <Navigate replace to={`${to("/sign-in")}?next=${encodeURIComponent(pathname + search)}`} />
  return children
}
