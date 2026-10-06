import catalog from "../features/catalog/catalog-data.json" with { type: "json" }
import { DEFAULT_LOCALE, type Locale } from "./locales.ts"

// Public pages that are rendered to static HTML at build time, once per published locale.
export const STATIC_PAGES = ["/", "/collection", "/about", "/contact", "/legal/terms", "/legal/privacy", "/legal/delivery"] as const

// Pages are built and settled in English first; Arabic and French are published together at the end.
export const PUBLISHED_LOCALES: readonly Locale[] = ["en"]

// Every published piece gets its own page. Read from the seed until the catalog API is deployed (AWS-1).
// This file is loaded by the build config in Node, so it reads the JSON directly instead of src/features/catalog.
const PRODUCT_PAGES = (catalog as { slug: string; status: string; displayOrder: number }[])
  .filter((piece) => piece.status === "published")
  .sort((a, b) => a.displayOrder - b.displayOrder)
  .map((piece) => `/collection/${piece.slug}`)

export function localizedPath(locale: string, path: string): string {
  if (locale === DEFAULT_LOCALE) return path
  return path === "/" ? `/${locale}` : `/${locale}${path}`
}

export async function prerenderPaths(): Promise<string[]> {
  return PUBLISHED_LOCALES.flatMap((locale) => [...STATIC_PAGES, ...PRODUCT_PAGES].map((page) => localizedPath(locale, page)))
}
