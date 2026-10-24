import type { Locale } from "./locales"

// Prices use Western digits and the $ sign in every locale ($1,120), as is usual in Lebanon. Cents show only when there
// are some ($12.50): the API gives money with up to 2 decimals.
const WHOLE = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
const CENTS = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatPrice(amount: number): string {
  return (Number.isInteger(amount) ? WHOLE : CENTS).format(amount)
}

// Fills "{name}" placeholders. Unknown placeholders are left as-is so a missing value is visible, not silent.
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match))
}

const LOCALE_TAG: Record<Locale, string> = { en: "en", ar: "ar-u-nu-latn", fr: "fr" }

export function formatNumber(locale: Locale, value: number): string {
  return new Intl.NumberFormat(LOCALE_TAG[locale]).format(value)
}

// Order dates as people say them in Lebanon ("6 November 2026"), on Beirut's calendar whatever the visitor's clock.
const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Beirut" })

export function formatDate(iso: string): string {
  return DATE.format(new Date(iso))
}
