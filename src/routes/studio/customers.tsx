import { STUDIO_COPY } from "@/features/studio/copy"
import { studioMeta } from "@/features/studio/meta"
import StudioCustomers from "@/pages/studio/StudioCustomers"

export const meta = () => studioMeta(STUDIO_COPY.customers.title)

export default StudioCustomers
