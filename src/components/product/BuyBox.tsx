import { MoveRight } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"
import { ActionLink, actionVariants } from "@/components/ui/action-link"
import { Eyebrow } from "@/components/ui/rule"
import { addToCart as addPiece } from "@/features/cart/cart"
import EditionLine from "@/features/catalog/EditionLine"
import { noBreak, stoneLabel } from "@/features/catalog/format"
import type { Product } from "@/features/catalog/types"
import NewsSignup from "@/features/news/NewsSignup"
import { formatPrice, interpolate } from "@/i18n/format"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"
import QuantityStepper from "./QuantityStepper"

interface BuyBoxProps {
  piece: Product
  /** The main ADD TO CART button, watched by the sticky bar. */
  addButtonRef?: React.Ref<HTMLButtonElement>
  className?: string
}

const caps = "text-label uppercase tracking-caps"
const ruledRow = "border-b border-border py-4.5"

export default function BuyBox({ piece, addButtonRef, className }: BuyBoxProps) {
  const { m, to } = useLocale()
  const [quantity, setQuantity] = useState(1)
  const name = noBreak(piece.name)

  // Opens the drawer; past a limit (5 pieces in all, or the pieces remaining) it adds nothing and the drawer says why.
  const addToCart = () => {
    if (addPiece(piece.id, quantity, piece.remaining) === "added") setQuantity(1)
  }

  return (
    <div className={cn("flex max-w-130 flex-col", className)}>
      <nav aria-label={m.product.breadcrumb} className={cn(caps, "mb-4 flex items-center gap-3 text-muted-foreground")}>
        <Link to={to("/collection")} className="flex min-h-11 items-center transition-colors duration-500 hover:text-foreground">
          {m.product.collection}
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-foreground">
          {name}
        </span>
      </nav>

      <h1 className="font-display text-display-l leading-[1.15] font-light">{name}</h1>
      <p className={cn(caps, "mt-4 text-muted-foreground")}>{stoneLabel(piece)}</p>
      {piece.summary && <p className="mt-6 text-small text-pretty text-muted-foreground">{piece.summary}</p>}
      <p className="mt-7 text-small tracking-price">{formatPrice(piece.price)}</p>

      <div className="mt-6 border-t border-border">
        {/* Sold out has its own box below, so this row names the edition instead of repeating "Sold out". */}
        <div className={ruledRow}>
          {piece.soldOut ? (
            <p className={caps}>{interpolate(m.edition.editionSoldOut, { edition: piece.editionSize })}</p>
          ) : (
            <EditionLine product={piece} />
          )}
        </div>
      </div>

      {piece.soldOut ? (
        <div className="mt-6 flex flex-col gap-5">
          <p className={cn(caps, "flex h-15 items-center justify-center border border-primary/40")}>{m.product.soldOut}</p>
          {/* The prototype's sold-out sign-up (POST /subscribers, rejoin). */}
          <div className="mt-5 flex flex-col gap-4">
            <Eyebrow>{m.footer.newEditions}</Eyebrow>
            <p className="font-display text-2xl leading-snug font-light text-pretty">{m.product.soldOutNews}</p>
            <NewsSignup id="sold-out-news" tone="light" />
          </div>
          {/* One wording for every piece: Omar can carve something similar on request. */}
          <div className="mt-5 flex flex-col gap-4 border-t border-border pt-7">
            <p className="text-small text-pretty text-muted-foreground">{m.product.soldOutSimilar}</p>
            <ActionLink to={to("/contact")} className="self-start">
              {m.product.contactOmar}
            </ActionLink>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <span className={caps}>{m.product.quantity}</span>
            <QuantityStepper value={quantity} max={piece.remaining} onChange={setQuantity} />
          </div>
          <p className="text-end text-xs text-muted-foreground">
            {piece.remaining === 1 ? m.product.capOne : interpolate(m.product.capMany, { count: piece.remaining })}
          </p>
          <button ref={addButtonRef} type="button" onClick={addToCart} className={cn(actionVariants({ variant: "solid", size: "lg" }), "mt-2 w-full")}>
            {m.product.addToCart}
            <MoveRight aria-hidden="true" strokeWidth={1.1} className="size-4.5 shrink-0 rtl:-scale-x-100" />
          </button>
          <p className="mt-1 text-center text-sm text-muted-foreground">{m.product.deliveryNote}</p>
        </div>
      )}
    </div>
  )
}
