import { interpolate } from "@/i18n/format"
import type { Messages } from "@/i18n/messages/en"
import type { ProductSummary } from "./types"

// Two-part names ("Qadisha · Earth") must never wrap around the dot.
export function noBreak(name: string): string {
  return name.replaceAll(" · ", " · ")
}

// "Cream limestone": the colour and the stone type, as cards and placards name the stone.
export function stoneLabel(piece: Pick<ProductSummary, "color" | "stoneType">): string {
  return `${piece.color} ${piece.stoneType.toLowerCase()}`
}

export function dimensionsLabel(piece: Pick<ProductSummary, "heightCm" | "widthCm" | "depthCm">, m: Messages): string | null {
  const { heightCm, widthCm, depthCm } = piece
  if (heightCm === null || widthCm === null || depthCm === null) return null
  return interpolate(m.catalog.dimensions, { height: heightCm, width: widthCm, depth: depthCm })
}

// ["Cream limestone", "118 × 36 × 20 cm", "Edition of 8"]; unknown parts are left out.
export function placardParts(piece: ProductSummary, m: Messages): string[] {
  return [stoneLabel(piece), dimensionsLabel(piece, m), interpolate(m.edition.of, { edition: piece.editionSize })].filter(
    (part): part is string => Boolean(part),
  )
}

export function placard(piece: ProductSummary, m: Messages): string {
  return placardParts(piece, m).join(" · ")
}

// The contract stores a story as one text with paragraphs separated by a blank line.
export function storyParagraphs(story: string | null): string[] {
  return (story ?? "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}
