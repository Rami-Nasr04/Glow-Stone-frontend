import { CRAFT_IMAGES } from "@/config/images"
import { listProducts } from "@/features/catalog/catalog"
import { toLocale } from "@/i18n/locales"
import { knownPrefix, localizedPath } from "@/i18n/paths"
import { MESSAGES } from "@/i18n/useLocale"
import { imageUrl } from "@/lib/images"
import { pageMeta } from "@/lib/meta"
import About from "@/pages/About"
import type { Route } from "./+types/about"

// The crest photo's alt text names its piece (Arz) from the data.
async function load() {
  const products = await listProducts()
  return { crestName: products.find((p) => p.id === CRAFT_IMAGES.crest.pieceId)?.name ?? null }
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

export function meta({ params }: Route.MetaArgs) {
  const locale = toLocale(params.lang)
  const m = MESSAGES[locale]
  return pageMeta({
    title: m.about.metaTitle,
    description: m.about.metaDescription,
    path: localizedPath(locale, "/about"),
    image: imageUrl(CRAFT_IMAGES.crest.key, 1440),
  })
}

export default function AboutRoute({ loaderData }: Route.ComponentProps) {
  return loaderData ? <About {...loaderData} /> : null
}
