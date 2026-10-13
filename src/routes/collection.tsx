import { listProducts } from "@/features/catalog/catalog"
import { toLocale } from "@/i18n/locales"
import { localizedPath } from "@/i18n/paths"
import { MESSAGES } from "@/i18n/useLocale"
import { pageMeta } from "@/lib/meta"
import Collection from "@/pages/Collection"
import type { Route } from "./+types/collection"

// Runs while the site is built.
export async function loader() {
  return { products: await listProducts() }
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
  return pageMeta({ title: m.collection.metaTitle, description: m.collection.metaDescription, path: localizedPath(locale, "/collection") })
}

export default function CollectionRoute({ loaderData }: Route.ComponentProps) {
  return <Collection {...loaderData} />
}
