import { interpolate } from "@/i18n/format"
import type { Locale } from "@/i18n/locales"
import { MESSAGES } from "@/i18n/useLocale"
import seed from "./catalog-data.json"
import type { ProductDetail, ProductImage, ProductSummary } from "./types"

// Until the catalog API is deployed (AWS-1), pages read the backend seed bundled at build time.
// These functions return exactly what GET /products and GET /products/{slug} return, so the switch stays in this file.

interface SeedText {
  name?: string
  stone?: string
  color?: string | null
  form?: string
  origin?: string | null
  finish?: string | null
  placement?: string | null
  indoorOutdoor?: string | null
  care?: string | null
  story?: string[]
  quote?: string | null
}

interface SeedProduct {
  slug: string
  family: string
  price: number
  editionSize: number
  remaining: number
  status: string
  leadType: string
  leadWeeks: number | null
  bottles: number
  heightCm: number | null
  widthCm: number | null
  depthCm: number | null
  weightKg: number | null
  tone: string
  featured: boolean
  displayOrder: number
  reissuable?: boolean
  translations: { en: SeedText & { name: string; stone: string; form: string }; ar?: SeedText; fr?: SeedText }
  images: { position: number; key: string; width: number; height: number }[]
}

const PUBLISHED: SeedProduct[] = (seed as SeedProduct[])
  .filter((p) => p.status === "published")
  .sort((a, b) => a.displayOrder - b.displayOrder)

// Like the API's coalesce(): a missing or null translated field falls back to English.
function localized(p: SeedProduct, locale: Locale) {
  const merged = { ...p.translations.en }
  const local = locale === "en" ? undefined : p.translations[locale]
  for (const [field, value] of Object.entries(local ?? {})) {
    if (value !== null && value !== undefined) Object.assign(merged, { [field]: value })
  }
  return merged
}

function photos(p: SeedProduct, name: string, locale: Locale): ProductImage[] {
  const sorted = [...p.images].sort((a, b) => a.position - b.position)
  return sorted.map((img, i) => ({
    key: img.key,
    width: img.width,
    height: img.height,
    alt: interpolate(MESSAGES[locale].catalog.photoAlt, { name, n: i + 1, total: sorted.length }),
  }))
}

function toSummary(p: SeedProduct, locale: Locale): ProductSummary {
  const t = localized(p, locale)
  const images = photos(p, t.name, locale)
  return {
    slug: p.slug,
    family: p.family,
    name: t.name,
    stone: t.stone,
    form: t.form,
    price: p.price,
    editionSize: p.editionSize,
    remaining: p.remaining,
    soldOut: p.remaining === 0,
    reissuable: p.reissuable ?? true,
    lead: p.leadType === "made_to_order" && p.leadWeeks !== null ? { type: "made_to_order", weeks: p.leadWeeks } : { type: "ready" },
    bottles: p.bottles,
    tone: p.tone === "dark" ? "dark" : "light",
    featured: p.featured,
    cover: images[0] ?? null,
    hover: images[1] ?? null,
  }
}

export function listProducts(locale: Locale): ProductSummary[] {
  return PUBLISHED.map((p) => toSummary(p, locale))
}

export function getProduct(slug: string, locale: Locale): ProductDetail | null {
  const p = PUBLISHED.find((candidate) => candidate.slug === slug)
  if (!p) return null
  const t = localized(p, locale)
  return {
    ...toSummary(p, locale),
    story: t.story ?? [],
    quote: t.quote ?? null,
    care: t.care ?? null,
    specs: {
      heightCm: p.heightCm,
      widthCm: p.widthCm,
      depthCm: p.depthCm,
      weightKg: p.weightKg,
      origin: t.origin ?? null,
      color: t.color ?? null,
      finish: t.finish ?? null,
      placement: t.placement ?? null,
      indoorOutdoor: t.indoorOutdoor ?? null,
    },
    images: photos(p, t.name, locale),
  }
}

export function productSlugs(): string[] {
  return PUBLISHED.map((p) => p.slug)
}
