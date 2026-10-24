import { STUDIO_COPY } from "@/features/studio/copy"
import { studioMeta } from "@/features/studio/meta"
import StudioOrder from "@/pages/studio/StudioOrder"

export const meta = () => studioMeta(STUDIO_COPY.order.title)

export default StudioOrder
