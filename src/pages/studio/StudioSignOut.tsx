import { useEffect, useRef } from "react"
import { useNavigate } from "react-router"
import { studioPath } from "@/config/studio"
import { useAdminAuth } from "@/features/studio/auth/admin-auth-context"
import { STUDIO_COPY } from "@/features/studio/copy"

// Reached like any other studio link, so an open form with unsaved changes asks before the admin gets here.
export default function StudioSignOut() {
  const { signOut } = useAdminAuth()
  const navigate = useNavigate()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    void signOut().finally(() => navigate(studioPath("/sign-in"), { replace: true }))
  }, [signOut, navigate])

  return (
    <p role="status" className="p-10 text-sm text-muted-foreground">
      {STUDIO_COPY.shell.signingOut}
    </p>
  )
}
