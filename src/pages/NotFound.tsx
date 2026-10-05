import { Link } from "react-router"
import { useLocale } from "@/i18n/useLocale"

export default function NotFound() {
  const { m, to } = useLocale()
  return (
    <section className="flex min-h-[70svh] flex-col items-center justify-center gap-8 px-gutter text-center">
      <h1 className="font-display text-display-xl font-light">404</h1>
      <p className="font-display text-lead italic">{m.notFound.title}</p>
      <Link to={to("/collection")} className="text-label uppercase tracking-label text-accent underline-offset-8 hover:underline">
        {m.notFound.back}
      </Link>
    </section>
  )
}
