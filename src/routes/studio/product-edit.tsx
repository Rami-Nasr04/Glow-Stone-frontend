import { STUDIO_COPY } from "@/features/studio/copy"
import { studioMeta } from "@/features/studio/meta"
import StudioProductEdit from "@/pages/studio/StudioProductEdit"

export const meta = () => studioMeta(STUDIO_COPY.list.title)

export default StudioProductEdit
