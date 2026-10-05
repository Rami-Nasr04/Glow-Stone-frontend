import type { Locale } from "./locales"

// Prices use Western digits and the $ sign in every locale ($1,120), as is usual in Lebanon.
const PRICE = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

export function formatPrice(amount: number): string {
  return PRICE.format(amount)
}

// Fills "{name}" placeholders. Unknown placeholders are left as-is so a missing value is visible, not silent.
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match))
}

const LOCALE_TAG: Record<Locale, string> = { en: "en", ar: "ar-u-nu-latn", fr: "fr" }

export function formatNumber(locale: Locale, value: number): string {
  return new Intl.NumberFormat(LOCALE_TAG[locale]).format(value)
}
