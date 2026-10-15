import { STUDIO_COPY } from "@/features/studio/copy"
import { studioMeta } from "@/features/studio/meta"
import StudioNotFound from "@/pages/studio/StudioNotFound"

export const meta = () => studioMeta(STUDIO_COPY.notFound.title)

// Outside the shell (any visitor can reach an unknown studio address), so it brings its own main.
export default function StudioNotFoundRoute() {
  return (
    <main id="main" className="min-h-svh bg-studio-surface px-4 lg:px-10">
      <StudioNotFound />
    </main>
  )
}
