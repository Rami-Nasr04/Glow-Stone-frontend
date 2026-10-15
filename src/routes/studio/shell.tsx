import { Outlet } from "react-router"
import RequireAdmin from "@/features/studio/auth/RequireAdmin"
import StudioShell from "@/features/studio/StudioShell"

// Every page inside the shell needs a signed-in admin.
export default function StudioShellRoute() {
  return (
    <RequireAdmin>
      <StudioShell>
        <Outlet />
      </StudioShell>
    </RequireAdmin>
  )
}
