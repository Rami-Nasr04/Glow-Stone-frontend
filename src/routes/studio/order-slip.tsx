import RequireAdmin from "@/features/studio/auth/RequireAdmin"
import { STUDIO_COPY } from "@/features/studio/copy"
import { studioMeta } from "@/features/studio/meta"
import StudioOrderSlip from "@/pages/studio/StudioOrderSlip"

export const meta = () => studioMeta(STUDIO_COPY.slip.title)

// The slip prints on its own, so it sits outside the studio's frame; it still needs a signed-in admin.
export default function OrderSlipRoute() {
  return (
    <RequireAdmin>
      <StudioOrderSlip />
    </RequireAdmin>
  )
}
