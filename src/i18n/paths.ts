import { DEFAULT_LOCALE, LOCALES } from "./locales.ts"

// Public pages that are rendered to static HTML at build time, once per locale.
// Product pages are appended in F2 once the catalog is available at build time.
export const STATIC_PAGES = ["/", "/collection", "/about", "/contact"] as const

export function localizedPath(locale: string, path: string): string {
  if (locale === DEFAULT_LOCALE) return path
  return path === "/" ? `/${locale}` : `/${locale}${path}`
}

export async function prerenderPaths(): Promise<string[]> {
  return LOCALES.flatMap((locale) => STATIC_PAGES.map((page) => localizedPath(locale, page)))
}
