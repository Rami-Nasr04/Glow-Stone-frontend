import { useParams } from "react-router"
import { getProduct } from "@/features/catalog/catalog"
import { noBreak } from "@/features/catalog/format"
import { useLocale } from "@/i18n/useLocale"
import NotFound from "@/pages/NotFound"

export default function Product() {
  const { slug = "" } = useParams()
  const { locale } = useLocale()
  const piece = getProduct(slug, locale)
  if (!piece) return <NotFound />

  return (
    <section className="px-gutter lg:pt-8">
      <div className="mx-auto max-w-content">
        <h1 className="font-display text-display-m font-light">{noBreak(piece.name)}</h1>
      </div>
    </section>
  )
}
