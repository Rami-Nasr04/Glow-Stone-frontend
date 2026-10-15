import { STUDIO_COPY } from "@/features/studio/copy"
import { studioMeta } from "@/features/studio/meta"
import StudioSignIn from "@/pages/studio/StudioSignIn"

export const meta = () => studioMeta(STUDIO_COPY.signIn.title)

export default StudioSignIn
