import { useLocale } from "@/i18n/useLocale"

export default function Home() {
  const { m } = useLocale()
  return (
    <section className="flex min-h-svh flex-col items-center justify-center gap-4 px-gutter text-center">
      <h1 className="font-display text-display-l font-light">{m.meta.siteName}</h1>
      <p className="text-label uppercase tracking-label">{m.meta.tagline}</p>
    </section>
  )
}
