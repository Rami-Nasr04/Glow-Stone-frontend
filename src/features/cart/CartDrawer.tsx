import { MoveRight, ShoppingBag } from "lucide-react"
import { Dialog } from "radix-ui"
import { useEffect, useState } from "react"
import { Link } from "react-router"
import Picture from "@/components/media/Picture"
import QuantityStepper from "@/components/product/QuantityStepper"
import { actionVariants } from "@/components/ui/action-link"
import { ACCOUNTS_OPEN } from "@/features/auth/client"
import { listProducts } from "@/features/catalog/catalog"
import { noBreak, stoneLabel } from "@/features/catalog/format"
import NoPhoto from "@/features/catalog/NoPhoto"
import { productPath } from "@/features/catalog/product-path"
import type { ProductSummary } from "@/features/catalog/types"
import { formatPrice, interpolate } from "@/i18n/format"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"
import { type CartLine, type CartNotice, closeCart, openCart, pieceCount, refreshCart, removeFromCart, setQuantity, useCart } from "./cart"

type Live =
  | { status: "loading" }
  | { status: "ready"; pieces: ReadonlyMap<number, ProductSummary>; lowered: readonly number[]; repriced: readonly number[] }
  | { status: "failed" }

// The last list read in this visit, in memory only: if a later read fails, lines keep their names and photos (never
// their prices).
let lastKnown: ReadonlyMap<number, ProductSummary> = new Map()

// GET /products each time the drawer opens with something in it (the panel mounts on every open), so names, prices,
// photos and stock are current, and the cart takes the newest prices.
function useLivePieces(hasLines: boolean): [Live, () => void] {
  const [live, setLive] = useState<Live>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!hasLines) return
    const abort = new AbortController()
    listProducts(abort.signal).then(
      (list) => {
        const pieces = new Map(list.map((piece) => [piece.id, piece]))
        lastKnown = pieces
        const { lowered, repriced } = refreshCart(list)
        setLive({ status: "ready", pieces, lowered, repriced })
      },
      () => {
        if (!abort.signal.aborted) setLive({ status: "failed" })
      },
    )
    return () => abort.abort()
  }, [hasLines, attempt])
  const retry = () => {
    setLive({ status: "loading" })
    setAttempt((n) => n + 1)
  }
  return [live, retry]
}

const caps = "text-label uppercase tracking-label"

// The header's cart button and the drawer it opens (prototype: SiteHeader). The button is the dialog's trigger, so
// closing the drawer, however it was opened, gives focus back to it.
export default function CartDrawer() {
  const { m } = useLocale()
  const { lines, open } = useCart()
  const count = pieceCount(lines)
  const buttonLabel = count === 0 ? m.cart.buttonEmpty : count === 1 ? m.cart.buttonOne : interpolate(m.cart.button, { count })

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (next ? openCart() : closeCart())}>
      <Dialog.Trigger aria-label={buttonLabel} className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 text-label tracking-wide">
        <ShoppingBag className="size-5" strokeWidth={1.1} aria-hidden="true" />
        <span aria-hidden="true">{count}</span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-primary/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-700" />
        <Dialog.Content className="fixed inset-y-0 end-0 z-50 flex w-full flex-col bg-background data-[state=open]:animate-in data-[state=open]:duration-700 data-[state=open]:ease-slow md:w-115 ltr:data-[state=open]:slide-in-from-right rtl:data-[state=open]:slide-in-from-left">
          <CartPanel />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// The drawer's inside. It mounts each time the drawer opens, so every opening reads the latest data.
function CartPanel() {
  const { m, to } = useLocale()
  const { lines, notice } = useCart()
  const count = pieceCount(lines)
  const [live, retry] = useLivePieces(lines.length > 0)

  const countText = count === 0 ? m.cart.empty : count === 1 ? m.cart.countOne : interpolate(m.cart.count, { count })
  const ready = live.status === "ready" ? live : null
  const orderable = ready ? lines.filter((line) => (ready.pieces.get(line.productId)?.remaining ?? 0) > 0) : []
  // Display only: the server prices the order from the database at checkout.
  const subtotal = ready ? orderable.reduce((sum, line) => sum + ready.pieces.get(line.productId)!.price * line.quantity, 0) : 0

  return (
    <>
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5 md:h-21 md:px-7">
        <Dialog.Title className="text-xs uppercase tracking-label">{m.cart.title}</Dialog.Title>
        <Dialog.Close className={cn(caps, "flex min-h-11 min-w-11 items-center justify-end")}>{m.cart.close}</Dialog.Close>
      </div>
      {/* Read when the drawer opens, and again whenever the count changes. */}
      <Dialog.Description role="status" className="sr-only">
        {countText}
      </Dialog.Description>

      <div className="flex-1 overflow-y-auto px-5 py-2 md:px-7">
        {notice && <CartNoticeLine notice={notice} />}
        {lines.length === 0 ? (
          <div className="flex flex-col items-start gap-6 py-16">
            <img src="/brand/glowstone-monogram.svg" alt="" width={36} height={36} className="size-9" />
            <p className="font-display text-3xl leading-snug font-light">{m.cart.empty}</p>
            <p className="text-small text-muted-foreground">{m.cart.emptyNote}</p>
            <Link to={to("/collection")} onClick={closeCart} className={actionVariants({ variant: "outline" })}>
              {m.cart.viewCollection}
              <MoveRight aria-hidden="true" strokeWidth={1.1} className="size-4.5 shrink-0 rtl:-scale-x-100" />
            </Link>
          </div>
        ) : live.status === "loading" ? (
          <p role="status" className="py-10 text-small text-muted-foreground">
            {m.cart.loading}
          </p>
        ) : (
          <>
            {live.status === "failed" && (
              <div role="alert" className="flex flex-wrap items-center justify-between gap-x-4 border-b border-border py-5 text-small">
                {m.cart.loadFailed}
                <button type="button" onClick={retry} className={cn(caps, "min-h-11 text-accent")}>
                  {m.cart.retry}
                </button>
              </div>
            )}
            <ul>
              {lines.map((line) => (
                <CartLineItem key={line.productId} line={line} live={live} />
              ))}
            </ul>
          </>
            )}
          </div>

          {lines.length > 0 && (
            <div className="flex shrink-0 flex-col gap-3 border-t border-border px-5 pt-6 pb-7 md:px-7">
              {ready && (
                <ul aria-label={m.cart.totals} className="flex flex-col gap-3 text-sm">
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">{m.cart.subtotal}</span>
                    <span className="tracking-price">{formatPrice(subtotal)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">{m.cart.delivery}</span>
                    <span>{m.cart.free}</span>
                  </li>
                  <li className="flex items-baseline justify-between border-t border-border pt-3">
                    <span className={caps}>{m.cart.total}</span>
                    <span className="text-lg tracking-price">{formatPrice(subtotal)}</span>
                  </li>
                </ul>
              )}
              <p className="text-xs text-muted-foreground">{m.product.deliveryNote}</p>
              <CheckoutButton disabled={ready !== null && orderable.length === 0} />
            </div>
          )}
    </>
  )
}

function CartNoticeLine({ notice }: { notice: CartNotice }) {
  const { m, to } = useLocale()
  if (notice.kind === "stock") {
    return (
      <p role="status" className="border-b border-border py-5 text-small">
        {notice.remaining === 1 ? m.cart.stockOne : interpolate(m.cart.stockMany, { count: notice.remaining })}
      </p>
    )
  }
  return (
    <div role="status" className="flex flex-col items-start gap-2 border-b border-border py-5 text-small">
      {m.cart.limit}
      <Link to={to("/contact")} onClick={closeCart} className={cn(caps, "flex min-h-11 items-center text-accent")}>
        {m.cart.contactOmar}
      </Link>
    </div>
  )
}

interface CartLineItemProps {
  line: CartLine
  live: Exclude<Live, { status: "loading" }>
}

function CartLineItem({ line, live }: CartLineItemProps) {
  const { m, to } = useLocale()
  const piece = live.status === "ready" ? live.pieces.get(line.productId) : lastKnown.get(line.productId)
  const name = piece ? noBreak(piece.name) : m.cart.unnamed
  const soldOut = live.status === "ready" && piece?.remaining === 0
  const cover = piece?.images[0]
  const remove = (
    <button
      type="button"
      aria-label={interpolate(m.cart.removeNamed, { name })}
      onClick={() => removeFromCart(line.productId)}
      className={cn(caps, "flex min-h-11 items-center", live.status === "ready" && piece && !soldOut ? "text-accent" : "underline underline-offset-4")}
    >
      {m.cart.remove}
    </button>
  )
  const photo = (
    <div className={cn("relative aspect-2/3 w-21 overflow-hidden bg-card", soldOut && "opacity-55 grayscale-70")}>
      {cover ? <Picture image={cover} alt="" sizes="84px" /> : <NoPhoto />}
    </div>
  )

  return (
    <li className="grid grid-cols-[5.25rem_1fr] gap-5 border-b border-border py-6">
      {piece ? (
        <Link to={to(productPath(piece))} onClick={closeCart} tabIndex={-1} aria-hidden="true">
          {photo}
        </Link>
      ) : (
        photo
      )}
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-2xl leading-tight font-light">
            {piece && live.status === "ready" ? (
              <Link to={to(productPath(piece))} onClick={closeCart} className="hover:text-accent">
                {name}
              </Link>
            ) : (
              name
            )}
          </h3>
          {/* Display only, like every price here. */}
          {live.status === "ready" && piece && !soldOut && <span className="text-sm tracking-price">{formatPrice(piece.price * line.quantity)}</span>}
        </div>
        {piece && <span className="text-label uppercase tracking-caps text-muted-foreground">{stoneLabel(piece)}</span>}
        {live.status === "ready" && piece && !soldOut && live.repriced.includes(line.productId) && <PriceUpdated />}

        {live.status === "failed" ? (
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-sm">{interpolate(m.cart.quantity, { count: line.quantity })}</span>
            {remove}
          </div>
        ) : !piece || soldOut ? (
          <div className="mt-2 flex flex-col items-start gap-1">
            <p className="flex items-center gap-2.5 text-sm text-accent">
              <span aria-hidden="true" className="size-1.75 rotate-45 bg-accent" />
              {piece ? m.cart.soldOut : m.cart.unavailable}
            </p>
            {remove}
          </div>
        ) : (
          <>
            <div className="mt-2.5 flex items-center justify-between gap-3">
              <QuantityStepper
                value={line.quantity}
                max={piece.remaining}
                onChange={(quantity) => setQuantity(line.productId, quantity, piece.remaining)}
                labels={{ decrease: interpolate(m.cart.decrease, { name }), increase: interpolate(m.cart.increase, { name }) }}
              />
              {remove}
            </div>
            <span className="text-xs text-muted-foreground">
              {live.lowered.includes(line.productId)
                ? piece.remaining === 1
                  ? m.cart.loweredOne
                  : interpolate(m.cart.loweredMany, { count: piece.remaining })
                : piece.remaining === 1
                  ? m.cart.capOne
                  : interpolate(m.cart.capMany, { count: piece.remaining })}
            </span>
          </>
        )}
      </div>
    </li>
  )
}

/** A quiet note on a line whose price changed since the customer last saw it (cart and checkout). */
export function PriceUpdated() {
  const { m } = useLocale()
  return (
    <span className="flex items-center gap-2 text-xs text-accent">
      <span aria-hidden="true" className="size-1.5 rotate-45 bg-accent" />
      {m.cart.priceUpdated}
    </span>
  )
}

// Checkout needs customer accounts: while they are closed (built sites without VITE_ACCOUNTS_OPEN=true) the button
// says ordering opens soon. This is the one place that decides.
function CheckoutButton({ disabled }: { disabled: boolean }) {
  const { m, to } = useLocale()
  const [said, setSaid] = useState(false)
  const look = cn(actionVariants({ variant: "solid", size: "lg" }), "mt-1.5 w-full")
  if (ACCOUNTS_OPEN) {
    if (disabled) {
      return (
        <button type="button" disabled className={cn(look, "disabled:opacity-40")}>
          {m.cart.checkout}
        </button>
      )
    }
    return (
      <Link to={to("/checkout")} onClick={closeCart} className={look}>
        {m.cart.checkout}
        <MoveRight aria-hidden="true" strokeWidth={1.1} className="size-4.5 shrink-0 rtl:-scale-x-100" />
      </Link>
    )
  }
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setSaid(true)}
        className={cn(actionVariants({ variant: "solid", size: "lg" }), "mt-1.5 w-full disabled:opacity-40")}
      >
        {m.cart.checkout}
        <MoveRight aria-hidden="true" strokeWidth={1.1} className="size-4.5 shrink-0 rtl:-scale-x-100" />
      </button>
      <p role="status" className="text-center text-sm text-pretty text-muted-foreground empty:hidden">
        {said ? m.cart.orderingSoon : ""}
      </p>
    </>
  )
}
