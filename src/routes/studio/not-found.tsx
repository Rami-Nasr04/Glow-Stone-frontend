import { STUDIO_COPY } from "@/features/studio/copy"
import { studioMeta } from "@/features/studio/meta"
import StudioNotFound from "@/pages/studio/StudioNotFound"

export const meta = () => studioMeta(STUDIO_COPY.notFound.title)

export default StudioNotFound
