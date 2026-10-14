import { productPath } from "../features/catalog/product-path.ts"
import { DEFAULT_LOCALE, isLocale, type Locale } from "./locales.ts"

// Public pages that are rendered to static HTML at build time, once per published locale.
export const STATIC_PAGES = ["/", "/collection", "/about", "/contact", "/legal/terms", "/legal/privacy", "/legal/delivery"] as const

// Pages are built and settled in English first; Arabic and French are published together at the end.
export const PUBLISHED_LOCALES: readonly Locale[] = ["en"]

// ":lang?" matches any first segment. Anything but a published locale (or none) is a missing page.
export function knownPrefix(lang: string | undefined): boolean {
  return lang === undefined || (isLocale(lang) && PUBLISHED_LOCALES.includes(lang))
}

export function localizedPath(locale: string, path: string): string {
  if (locale === DEFAULT_LOCALE) return path
  return path === "/" ? `/${locale}` : `/${locale}${path}`
}

// Every published piece (GET /products, newest first) gets its own page under its current name,
// /collection/<id>/<readable name>. Called by the build config in Node (react-router.config.ts).
export function prerenderPaths(products: readonly { id: number; name: string }[]): string[] {
  const pages = [...STATIC_PAGES, ...products.map(productPath)]
  return PUBLISHED_LOCALES.flatMap((locale) => pages.map((page) => localizedPath(locale, page)))
}
