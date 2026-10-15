import { Outlet } from "react-router"
import AdminAuthProvider from "@/features/studio/auth/AdminAuthProvider"
import { studioMeta } from "@/features/studio/meta"

export const meta = () => studioMeta()

// The studio's own session (the admin pool), for every studio page and nothing in the shop.
export default function StudioLayout() {
  return (
    <AdminAuthProvider>
      <Outlet />
    </AdminAuthProvider>
  )
}
