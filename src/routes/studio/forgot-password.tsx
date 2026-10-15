import { STUDIO_COPY } from "@/features/studio/copy"
import { studioMeta } from "@/features/studio/meta"
import StudioForgotPassword from "@/pages/studio/StudioForgotPassword"

export const meta = () => studioMeta(STUDIO_COPY.forgot.title)

export default StudioForgotPassword
