import { STUDIO_COPY } from "@/features/studio/copy"
import { studioMeta } from "@/features/studio/meta"
import StudioOrders from "@/pages/studio/StudioOrders"

export const meta = () => studioMeta(STUDIO_COPY.orders.title)

export default StudioOrders
