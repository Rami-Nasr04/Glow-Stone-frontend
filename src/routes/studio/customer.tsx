import { STUDIO_COPY } from "@/features/studio/copy"
import { studioMeta } from "@/features/studio/meta"
import StudioCustomer from "@/pages/studio/StudioCustomer"

export const meta = () => studioMeta(STUDIO_COPY.customers.one)

export default StudioCustomer
