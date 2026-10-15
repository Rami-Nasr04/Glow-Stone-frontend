import { STUDIO_COPY } from "@/features/studio/copy"
import { studioMeta } from "@/features/studio/meta"
import StudioNewPassword from "@/pages/studio/StudioNewPassword"

export const meta = () => studioMeta(STUDIO_COPY.newPassword.title)

export default StudioNewPassword
