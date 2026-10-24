import { Link } from "react-router"
import { studioPath } from "@/config/studio"
import { cn } from "@/lib/utils"
import { STUDIO_COPY } from "./copy"
import { type AdminOrderSummary, formatMoney, formatOrderTime, formatPhone, piecesLabel } from "./orders"
import StatusBadge from "./StatusBadge"

const t = STUDIO_COPY.orders

// Desktop columns as in the prototype, with the city and the piece count the brief asks for (the list has no item
// names): number, placed, customer + phone, city, pieces, total, status. Phones: number + name and the total, then a
// line with date · city · pieces · gift, then the status.
const columns = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 lg:grid-cols-[6.5rem_10rem_minmax(0,1.4fr)_minmax(0,1fr)_5.5rem_6.5rem_11rem]"

interface GiftMarkProps {
  className?: string
}

// A mark and a word: the order is a gift, so its slip hides the prices and the buyer pays.
export function GiftMark({ className }: GiftMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-accent", className)}>
      <span aria-hidden="true" className="size-1.5 rotate-45 bg-accent" />
      {t.gift}
    </span>
  )
}

/** The column names above the rows, on desktop only (each row says it all on phones). */
export function OrderListHeader() {
  return (
    <div aria-hidden="true" className={cn(columns, "hidden border-b border-border px-5 py-3 text-label uppercase tracking-caps text-muted-foreground lg:grid")}>
      <span>{t.columns.number}</span>
      <span>{t.columns.placed}</span>
      <span>{t.columns.customer}</span>
      <span>{t.columns.city}</span>
      <span>{t.columns.pieces}</span>
      <span className="text-end">{t.columns.total}</span>
      <span>{t.columns.status}</span>
    </div>
  )
}

interface OrderRowProps {
  order: AdminOrderSummary
  /** The list's filter ("?status=pending"), so the order's back link returns to it. */
  back?: string
}

// New orders are the pending ones (Omar calls to confirm them): a wine rule at the start, a faint wash and medium
// weight, as the prototype's new rows; the badge says Pending too.
export default function OrderRow({ order, back = "" }: OrderRowProps) {
  const pending = order.status === "pending"
  const when = formatOrderTime(order.createdAt)
  return (
    <li data-pending={pending || undefined} className={cn("border-b border-s-2 border-b-border last:border-b-0", pending ? "border-s-accent bg-accent/5" : "border-s-transparent")}>
      <Link to={studioPath(`/orders/${order.id}`)} state={back ? { back } : undefined} className={cn(columns, "px-5 py-3 transition-colors duration-500 hover:bg-studio-surface/60")}>
        <span className={cn("flex min-w-0 flex-col gap-0.5", pending && "font-medium")}>
          <span>{order.number}</span>
          <span className="truncate lg:hidden">{order.customer.name}</span>
        </span>
        <span className="hidden text-sm text-muted-foreground lg:block">{when}</span>
        <span className="hidden min-w-0 flex-col lg:flex">
          <span className={cn("truncate", pending && "font-medium")}>{order.customer.name}</span>
          <span className="text-sm text-muted-foreground">{formatPhone(order.customer.phone)}</span>
        </span>
        <span className="hidden truncate lg:block">{order.city}</span>
        <span className="hidden lg:flex lg:flex-col">
          <span>{piecesLabel(order.itemCount)}</span>
          {order.isGift && <GiftMark className="text-xs" />}
        </span>
        <span className={cn("text-end", pending && "font-medium")}>{formatMoney(order.total)}</span>
        <span className="col-span-2 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground lg:hidden">
          <span>{when}</span>
          <span aria-hidden="true">·</span>
          <span>{order.city}</span>
          <span aria-hidden="true">·</span>
          <span>{piecesLabel(order.itemCount)}</span>
          {order.isGift && (
            <>
              <span aria-hidden="true">·</span>
              <GiftMark />
            </>
          )}
        </span>
        <span className="col-span-2 lg:col-span-1">
          <StatusBadge status={order.status} />
        </span>
      </Link>
    </li>
  )
}
