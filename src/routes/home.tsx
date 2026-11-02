import { getProduct, listProducts } from "@/features/catalog/catalog"
import { toLocale } from "@/i18n/locales"
import { knownPrefix, localizedPath } from "@/i18n/paths"
import { MESSAGES } from "@/i18n/useLocale"
import { SITE_URL } from "@/config/site"
import { pageMeta } from "@/lib/meta"
import { storeJsonLd } from "@/lib/structured-data"
import Home from "@/pages/Home"
import type { Route } from "./+types/home"

// The pieces in Omar's order, and the first one whole: the hero and the spotlight follow it (Rami, 2026-11-02).
async function load() {
  const products = await listProducts()
  const first = products[0] ? await getProduct(products[0].id) : null
  return { products, first }
}

// Runs while the site is built.
export function loader() {
  return load()
}

// In the browser: the data written into the page when it was built, or the live API if this HTML has none (a host
// that answered with another page's HTML). Nothing under an unknown first segment: the layout shows the 404 there.
// Never call `loader` here: React Router leaves it out of the browser bundle.
export async function clientLoader({ params, serverLoader }: Route.ClientLoaderArgs) {
  if (!knownPrefix(params.lang)) return null
  try {
    return await serverLoader()
  } catch {
    return load()
  }
}

// The link preview is Rami's hero scene (the default), never the first piece's.
export function meta({ params }: Route.MetaArgs) {
  const locale = toLocale(params.lang)
  const m = MESSAGES[locale]
  return [
    ...pageMeta({ title: m.home.metaTitle, description: m.home.metaDescription, path: localizedPath(locale, "/") }),
    { "script:ld+json": storeJsonLd(SITE_URL) },
  ]
}

export default function HomeRoute({ loaderData }: Route.ComponentProps) {
  return loaderData ? <Home {...loaderData} /> : null
}
