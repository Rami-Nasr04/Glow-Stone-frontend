import { STUDIO_COPY } from "@/features/studio/copy"
import { studioMeta } from "@/features/studio/meta"
import StudioProducts from "@/pages/studio/StudioProducts"

export const meta = () => studioMeta(STUDIO_COPY.list.title)

export default StudioProducts
