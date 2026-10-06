import { getProduct } from "@/features/catalog/catalog"
import { interpolate } from "@/i18n/format"
import { toLocale } from "@/i18n/locales"
import { localizedPath } from "@/i18n/paths"
import { MESSAGES } from "@/i18n/useLocale"
import { imageUrl } from "@/lib/images"
import { pageMeta } from "@/lib/meta"
import Product from "@/pages/Product"
import type { Route } from "./+types/product"

export function meta({ params }: Route.MetaArgs) {
  const locale = toLocale(params.lang)
  const m = MESSAGES[locale]
  const piece = getProduct(params.slug, locale)
  if (!piece) return [{ title: m.notFound.title }]
  return pageMeta({
    title: interpolate(m.product.metaTitle, { name: piece.name }),
    description: piece.form,
    path: localizedPath(locale, `/collection/${piece.slug}`),
    image: piece.cover ? imageUrl(piece.cover.key, 1440) : undefined,
  })
}

export default Product
