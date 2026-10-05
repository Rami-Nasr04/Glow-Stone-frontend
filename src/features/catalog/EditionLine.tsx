import { interpolate } from "@/i18n/format"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"
import type { ProductSummary } from "./types"

interface EditionLineProps {
  product: Pick<ProductSummary, "editionSize" | "remaining" | "soldOut">
  /** Copy with {edition} and {remaining}; defaults to "Edition of {edition} — {remaining} remaining". */
  template?: string
  /** Shown before the edition, e.g. the stone on a compact card. */
  prefix?: string
  onDark?: boolean
  className?: string
}

export default function EditionLine({ product, template, prefix, onDark = false, className }: EditionLineProps) {
  const { m } = useLocale()
  const [before, after = ""] = interpolate(template ?? m.edition.remaining, { edition: product.editionSize }).split("{remaining}")
  return (
    <span className={cn("text-label uppercase tracking-caps", className)}>
      {prefix && `${prefix} · `}
      {product.soldOut ? (
        m.edition.soldOut
      ) : (
        <>
          {before}
          <span className={cn("font-medium", onDark ? "text-dark-section-foreground" : "text-accent")}>{product.remaining}</span>
          {after}
        </>
      )}
    </span>
  )
}
