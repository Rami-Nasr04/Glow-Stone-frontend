import { STUDIO_COPY } from "@/features/studio/copy"
import { studioMeta } from "@/features/studio/meta"

export const meta = () => studioMeta(STUDIO_COPY.list.title)

export default function StudioProductEditRoute() {
  return <h1 className="font-display text-4xl font-light lg:text-[2.75rem]">{STUDIO_COPY.list.title}</h1>
}
