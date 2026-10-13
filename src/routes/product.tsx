import { ActionLink } from "@/components/ui/action-link"
import { Rule } from "@/components/ui/rule"
import { getProduct, listProducts } from "@/features/catalog/catalog"
import { parseProductId, productPath } from "@/features/catalog/product-path"
import { interpolate } from "@/i18n/format"
import { toLocale } from "@/i18n/locales"
import { localizedPath } from "@/i18n/paths"
import { MESSAGES, useLocale } from "@/i18n/useLocale"
import { photoUrl } from "@/lib/images"
import { pageMeta } from "@/lib/meta"
import Product from "@/pages/Product"
import type { Route } from "./+types/product"

async function load(rawId: string | undefined) {
  const id = parseProductId(rawId)
  if (id === null) return { piece: null, products: [] }
  const [piece, products] = await Promise.all([getProduct(id), listProducts()])
  return { piece, products }
}

// Runs while the site is built, once per published piece (src/i18n/paths.ts).
export function loader({ params }: Route.LoaderArgs) {
  return load(params.id)
}

// In the browser: the data written into the page when it was built. A page that wasn't built (a piece published
// since, or an old or mistyped name in the address) has none, so it asks the API itself.
export async function clientLoader({ params, serverLoader }: Route.ClientLoaderArgs) {
  try {
    return await serverLoader()
  } catch {
    return load(params.id)
  }
}

export function meta({ params, loaderData }: Route.MetaArgs) {
  const locale = toLocale(params.lang)
  const m = MESSAGES[locale]
  const piece = loaderData?.piece
  if (!piece) return [{ title: m.notFound.metaTitle }, { name: "robots", content: "noindex" }]
  const cover = piece.images[0]
  return pageMeta({
    title: interpolate(m.product.metaTitle, { name: piece.name }),
    description: piece.summary ?? m.collection.metaDescription,
    // Always the current address, so a link with an old name still previews and indexes the right page.
    path: localizedPath(locale, productPath(piece)),
    image: cover ? photoUrl(cover, 1440) : undefined,
  })
}

// Only a page that wasn't built can fail here: the API couldn't be reached from the browser.
export function ErrorBoundary() {
  const { m, to } = useLocale()
  return (
    <section className="flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center gap-8 px-gutter py-24 text-center">
      <h1 className="max-w-205 font-display text-display-l leading-[1.08] font-light italic text-balance">{m.product.loadFailed}</h1>
      <Rule />
      <p className="max-w-110 text-muted-foreground">{m.product.loadFailedLead}</p>
      <ActionLink to={to("/collection")} variant="solid">
        {m.notFound.viewCollection}
      </ActionLink>
    </section>
  )
}

export default function ProductRoute({ loaderData }: Route.ComponentProps) {
  return <Product {...loaderData} />
}
