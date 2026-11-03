import { STUDIO_COPY } from "@/features/studio/copy"
import { studioMeta } from "@/features/studio/meta"
import StudioAnnouncements from "@/pages/studio/StudioAnnouncements"

export const meta = () => studioMeta(STUDIO_COPY.announcements.title)

export default StudioAnnouncements
