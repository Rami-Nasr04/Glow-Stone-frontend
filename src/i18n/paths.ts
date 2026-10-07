import catalog from "../features/catalog/catalog-data.json" with { type: "json" }
import { productPath } from "../features/catalog/product-path.ts"
import { DEFAULT_LOCALE, type Locale } from "./locales.ts"

// Public pages that are rendered to static HTML at build time, once per published locale.
export const STATIC_PAGES = ["/", "/collection", "/about", "/contact", "/legal/terms", "/legal/privacy", "/legal/delivery"] as const

// Pages are built and settled in English first; Arabic and French are published together at the end.
export const PUBLISHED_LOCALES: readonly Locale[] = ["en"]

// Every published piece gets its own page, /collection/<id>/<readable name>, newest first like GET /products.
// Read from the bundled copy until the products API is live. This file is loaded by the build config in Node, so it
// reads the JSON directly instead of src/features/catalog/catalog.ts.
const PRODUCT_PAGES = (catalog as { id: number; name: string; createdAt: string }[])
  .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
  .map(productPath)

export function localizedPath(locale: string, path: string): string {
  if (locale === DEFAULT_LOCALE) return path
  return path === "/" ? `/${locale}` : `/${locale}${path}`
}

export async function prerenderPaths(): Promise<string[]> {
  return PUBLISHED_LOCALES.flatMap((locale) => [...STATIC_PAGES, ...PRODUCT_PAGES].map((page) => localizedPath(locale, page)))
}
