import { STUDIO_COPY } from "@/features/studio/copy"
import { studioMeta } from "@/features/studio/meta"
import StudioProductNew from "@/pages/studio/StudioProductNew"

export const meta = () => studioMeta(STUDIO_COPY.form.newTitle)

export default StudioProductNew
