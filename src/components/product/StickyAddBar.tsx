import { MoveRight } from "lucide-react"
import { useEffect, useState } from "react"
import Picture from "@/components/media/Picture"
import { addToCart } from "@/features/cart/cart"
import { noBreak } from "@/features/catalog/format"
import type { Product } from "@/features/catalog/types"
import { formatPrice } from "@/i18n/format"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"

interface StickyAddBarProps {
  piece: Product
  /** The main ADD TO CART button; the bar shows only while it has scrolled above the screen. */
  target: React.RefObject<HTMLButtonElement | null>
}

export default function StickyAddBar({ piece, target }: StickyAddBarProps) {
  const { m } = useLocale()
  const [shown, setShown] = useState(false)
  const cover = piece.images[0]

  useEffect(() => {
    // Shown while the button is above the screen; hidden again as soon as it is back (or still below).
    // A scroll listener, not an IntersectionObserver: a jump or fast fling past the button never "intersects",
    // so an observer would miss it.
    const update = () => {
      const button = target.current
      if (button) setShown(button.getBoundingClientRect().bottom < 0)
    }
    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [target])

  return (
    <div
      data-sticky-bar
      aria-hidden={!shown}
      inert={!shown}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 bg-dark-section px-gutter py-2.5 text-dark-section-foreground transition-transform duration-700 ease-slow",
        shown ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="mx-auto flex max-w-content items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          {cover && (
            <div className="hidden h-12 w-8 shrink-0 lg:block">
              <Picture image={cover} alt="" sizes="32px" />
            </div>
          )}
          <span className="truncate font-display text-lg lg:text-2xl">{noBreak(piece.name)}</span>
          <span className="text-price tracking-price text-dark-muted-foreground">{formatPrice(piece.price)}</span>
        </div>
        <button
          type="button"
          onClick={() => addToCart(piece.id, 1, piece.remaining, piece.price)}
          className="flex min-h-12 shrink-0 items-center gap-3.5 bg-background px-6 text-label uppercase tracking-label text-foreground transition-colors duration-500 hover:bg-on-photo"
        >
          {m.product.addToCart}
          <MoveRight aria-hidden="true" strokeWidth={1.1} className="size-4.5 rtl:-scale-x-100" />
        </button>
      </div>
    </div>
  )
}
