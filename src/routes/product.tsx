import { getProduct } from "@/features/catalog/catalog"
import { coverOf } from "@/features/catalog/photos"
import { parseProductId, productPath } from "@/features/catalog/product-path"
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
  const id = parseProductId(params.id)
  const piece = id === null ? null : getProduct(id)
  if (!piece) return [{ title: m.notFound.metaTitle }, { name: "robots", content: "noindex" }]
  const cover = coverOf(piece)
  return pageMeta({
    title: interpolate(m.product.metaTitle, { name: piece.name }),
    description: piece.summary ?? m.collection.metaDescription,
    // Always the current address, so a link with an old name still previews and indexes the right page.
    path: localizedPath(locale, productPath(piece)),
    image: cover ? imageUrl(cover.key, 1440) : undefined,
  })
}

export default Product
