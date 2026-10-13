import { HOME_PIECE } from "@/components/home/home-config"
import { getProduct, listProducts } from "@/features/catalog/catalog"
import { toLocale } from "@/i18n/locales"
import { localizedPath } from "@/i18n/paths"
import { MESSAGES } from "@/i18n/useLocale"
import { pageMeta } from "@/lib/meta"
import Home from "@/pages/Home"
import type { Route } from "./+types/home"

// Runs while the site is built. The hero photo and the spotlight show the home piece, so the build stops rather
// than publish a home page about a piece that is no longer for sale.
export async function loader() {
  const [products, piece] = await Promise.all([listProducts(), getProduct(HOME_PIECE)])
  if (!piece) throw new Error(`The home piece (id ${HOME_PIECE}) is not published: publish it again, or change HOME_PIECE.`)
  return { products, piece }
}

// In the browser: the data written into the page when it was built, or the live API if this HTML has none (a host
// that answered with another page's HTML).
export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  try {
    return await serverLoader()
  } catch {
    return loader()
  }
}

export function meta({ params }: Route.MetaArgs) {
  const locale = toLocale(params.lang)
  const m = MESSAGES[locale]
  return pageMeta({ title: m.home.metaTitle, description: m.home.metaDescription, path: localizedPath(locale, "/") })
}

export default function HomeRoute({ loaderData }: Route.ComponentProps) {
  return <Home {...loaderData} />
}
