import { DEFAULT_LOCALE, type Locale } from "./locales.ts"

// Public pages that are rendered to static HTML at build time, once per published locale.
// Product pages are appended in F2 once the catalog is available at build time.
export const STATIC_PAGES = ["/", "/collection", "/about", "/contact"] as const

// Pages are built and settled in English first; Arabic and French are published together at the end.
export const PUBLISHED_LOCALES: readonly Locale[] = ["en"]

export function localizedPath(locale: string, path: string): string {
  if (locale === DEFAULT_LOCALE) return path
  return path === "/" ? `/${locale}` : `/${locale}${path}`
}

export async function prerenderPaths(): Promise<string[]> {
  return PUBLISHED_LOCALES.flatMap((locale) => STATIC_PAGES.map((page) => localizedPath(locale, page)))
}
