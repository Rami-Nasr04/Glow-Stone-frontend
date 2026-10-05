import { interpolate } from "@/i18n/format"
import type { Messages } from "@/i18n/messages/en"
import type { ProductDetail, ProductSpecs } from "./types"

// Two-part names ("Qadisha · Earth") must never wrap around the dot.
export function noBreak(name: string): string {
  return name.replaceAll(" · ", " · ")
}

export function dimensionsLabel(specs: ProductSpecs, m: Messages): string | null {
  const { heightCm, widthCm, depthCm } = specs
  if (heightCm === null || widthCm === null || depthCm === null) return null
  return interpolate(m.catalog.dimensions, { height: heightCm, width: widthCm, depth: depthCm })
}

// "Cream limestone · 118 × 36 × 20 cm · Edition of 8"; unknown parts are left out.
export function placard(product: ProductDetail, m: Messages): string {
  return [product.stone, dimensionsLabel(product.specs, m), interpolate(m.edition.of, { edition: product.editionSize })]
    .filter((part): part is string => Boolean(part))
    .join(" · ")
}
