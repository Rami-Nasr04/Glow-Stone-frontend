import { ActionLink } from "@/components/ui/action-link"
import { Rule } from "@/components/ui/rule"
import { useLocale } from "@/i18n/useLocale"

export default function NotFound() {
  const { m, to } = useLocale()
  return (
    <section className="flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center gap-8 px-gutter py-24 text-center">
      <img src="/brand/glowstone-monogram.svg" alt="" width={88} height={88} className="size-22 opacity-50" />
      <p className="text-label uppercase tracking-label text-muted-foreground">{m.notFound.label}</p>
      <h1 className="max-w-205 font-display text-display-l leading-[1.08] font-light italic text-balance lg:text-display-xl">{m.notFound.title}</h1>
      <Rule />
      <p className="max-w-110 text-muted-foreground">{m.notFound.lead}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <ActionLink to={to("/collection")} variant="solid">
          {m.notFound.viewCollection}
        </ActionLink>
        <ActionLink to={to("/")} arrow={false}>
          {m.notFound.home}
        </ActionLink>
      </div>
    </section>
  )
}
