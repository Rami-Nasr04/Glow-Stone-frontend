import { Navigate, useLocation } from "react-router"
import { studioPath } from "@/config/studio"
import { STUDIO_COPY } from "../copy"
import { useAdminAuth } from "./admin-auth-context"

interface RequireAdminProps {
  children: React.ReactNode
}

// Studio pages: wait for the saved session, then show the page or send the visitor to sign in and back.
export default function RequireAdmin({ children }: RequireAdminProps) {
  const { status } = useAdminAuth()
  const { pathname, search } = useLocation()
  if (status === "loading") {
    return (
      <p role="status" className="sr-only">
        {STUDIO_COPY.checking}
      </p>
    )
  }
  if (status === "signedOut") return <Navigate replace to={`${studioPath("/sign-in")}?next=${encodeURIComponent(pathname + search)}`} />
  return children
}
