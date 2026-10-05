import { useParams } from "react-router"
import { toLocale, type Locale } from "./locales"
import { en, type Messages } from "./messages/en"
import { localizedPath } from "./paths"

// Every locale reads the English copy until the Arabic and French dictionaries are added.
export const MESSAGES: Record<Locale, Messages> = { en, ar: en, fr: en }

export interface LocaleTools {
  locale: Locale
  m: Messages
  /** Prefixes a path with the current locale ("/collection" → "/ar/collection"). */
  to: (path: string) => string
}

export function useLocale(): LocaleTools {
  const locale = toLocale(useParams().lang)
  return { locale, m: MESSAGES[locale], to: (path) => localizedPath(locale, path) }
}
