import Picture from "@/components/media/Picture"
import { internationalPhone } from "@/features/auth/rules"
import NoPhoto from "@/features/catalog/NoPhoto"
import { noBreak } from "@/features/catalog/format"
import { formatPrice, interpolate } from "@/i18n/format"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"
import type { Order, OrderStatus } from "./types"

// The parts of an order shown on the confirmation and on the order page (prototype: Confirmation, Account).

const caps = "text-label uppercase tracking-label"

const BADGES: Record<OrderStatus, { mark: string; look: string }> = {
  pending: { mark: "○", look: "border border-primary" },
  confirmed: { mark: "●", look: "border border-primary bg-primary text-primary-foreground" },
  out_for_delivery: { mark: "→", look: "border border-accent text-accent" },
  delivered: { mark: "✓", look: "border border-transparent bg-card" },
  cancelled: { mark: "×", look: "border border-dashed border-muted-foreground text-muted-foreground" },
}

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const { m } = useLocale()
  const { mark, look } = BADGES[status]
  return (
    <span className={cn(caps, "inline-flex min-h-8 w-max items-center gap-2 px-3", look, className)}>
      <span aria-hidden="true">{mark}</span>
      {m.orders.status[status]}
    </span>
  )
}

export function OrderItems({ order }: { order: Order }) {
  const { m } = useLocale()
  return (
    <ul className="flex flex-col">
      {order.items.map((item) => (
        <li key={item.productId} className="grid grid-cols-[4.5rem_1fr_auto] gap-5 border-b border-border py-5">
          <div className="relative aspect-2/3 overflow-hidden bg-card">
            {item.image ? <Picture image={item.image} alt="" sizes="72px" /> : <NoPhoto />}
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="font-display text-2xl leading-tight font-light">{noBreak(item.name)}</span>
            <span className="text-label uppercase tracking-caps text-muted-foreground">
              {[item.stoneType, item.color, interpolate(m.orders.qty, { count: item.quantity })].filter(Boolean).join(" · ")}
            </span>
          </div>
          {/* The price paid, as the server keeps it. */}
          <span className="text-sm tracking-price">{formatPrice(item.lineTotal)}</span>
        </li>
      ))}
    </ul>
  )
}

export function OrderTotals({ order, totalLabel }: { order: Order; totalLabel: string }) {
  const { m } = useLocale()
  return (
    <div className="flex flex-col gap-3 pt-5 text-sm">
      <p className="flex justify-between">
        <span className="text-muted-foreground">{m.orders.subtotal}</span>
        <span className="tracking-price">{formatPrice(order.subtotal)}</span>
      </p>
      {/* A fee only appears once Omar has agreed it on his call. */}
      <p className="flex justify-between">
        <span className="text-muted-foreground">{m.orders.delivery}</span>
        <span>{order.deliveryFee === 0 ? m.orders.free : formatPrice(order.deliveryFee)}</span>
      </p>
      <p className="flex items-baseline justify-between border-t border-border pt-3">
        <span className={caps}>{totalLabel}</span>
        <span className="text-lg tracking-price">{formatPrice(order.total)}</span>
      </p>
    </div>
  )
}

export function DeliverTo({ order }: { order: Order }) {
  const { m } = useLocale()
  return (
    <section aria-labelledby={`deliver-to-${order.id}`} className="flex flex-col gap-3">
      <h2 id={`deliver-to-${order.id}`} className={cn(caps, "border-b border-border pb-4")}>
        {m.orders.deliverTo}
      </h2>
      <p>
        {order.recipient.name} · {internationalPhone(order.recipient.phone)}
      </p>
      <p className="text-small text-muted-foreground">
        {order.address}, {order.city}
      </p>
      {order.deliveryNotes && <p className="text-small text-muted-foreground">{interpolate(m.orders.notes, { notes: order.deliveryNotes })}</p>}
    </section>
  )
}

export function GiftInfo({ order }: { order: Order }) {
  const { m } = useLocale()
  if (!order.isGift) return null
  return (
    <section aria-labelledby={`gift-${order.id}`} className="flex flex-col gap-3">
      <h2 id={`gift-${order.id}`} className={cn(caps, "border-b border-border pb-4")}>
        {m.orders.giftLabel}
      </h2>
      {order.giftMessage ? (
        <p className="font-display text-xl italic">“{order.giftMessage}”</p>
      ) : (
        <p className="text-small text-muted-foreground">{m.orders.noCard}</p>
      )}
      {/* The buyer pays, not the recipient: Omar arranges it with them (Rami, 2026-10-24). */}
      <p className="text-small">{m.orders.giftPayment}</p>
      <p className="text-xs text-muted-foreground">{m.orders.pricesHidden}</p>
    </section>
  )
}
