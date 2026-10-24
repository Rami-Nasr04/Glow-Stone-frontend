import { Link } from "react-router"
import { actionVariants } from "@/components/ui/action-link"
import { studioPath } from "@/config/studio"
import { STUDIO_COPY } from "@/features/studio/copy"

const t = STUDIO_COPY.notFound

// An unknown studio address, or a piece the API doesn't know.
export default function StudioNotFound() {
  return (
    <div className="flex flex-col items-start gap-5 py-10">
      <h1 className="font-display text-4xl font-light lg:text-[2.75rem]">{t.title}</h1>
      <p className="text-small text-muted-foreground">{t.text}</p>
      <Link to={studioPath("/orders")} className={actionVariants({ variant: "solid" })}>
        {t.back}
      </Link>
    </div>
  )
}
