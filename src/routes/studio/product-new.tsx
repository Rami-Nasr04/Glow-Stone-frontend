import { STUDIO_COPY } from "@/features/studio/copy"
import { studioMeta } from "@/features/studio/meta"

export const meta = () => studioMeta(STUDIO_COPY.form.newTitle)

export default function StudioProductNewRoute() {
  return <h1 className="font-display text-4xl font-light lg:text-[2.75rem]">{STUDIO_COPY.form.newTitle}</h1>
}
