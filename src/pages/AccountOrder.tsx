import { MoveLeft } from "lucide-react"
import { useState } from "react"
import { Link, useParams } from "react-router"
import { actionVariants } from "@/components/ui/action-link"
import { useOrders } from "@/features/orders/client"
import { DeliverTo, GiftInfo, OrderItems, OrderTotals, StatusBadge } from "@/features/orders/OrderParts"
import { type Failure, failureOf, useOrder } from "@/features/orders/use-order"
import { type Order, OrderError, type OrderStatus } from "@/features/orders/types"
import { formatDate, interpolate } from "@/i18n/format"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"
import OrderMissing from "./OrderMissing"

const caps = "text-label uppercase tracking-label"

const STEPS: OrderStatus[] = ["pending", "confirmed", "out_for_delivery", "delivered"]

function Timeline({ order }: { order: Order }) {
  const { m } = useLocale()
  const t = m.orders
  // Every step up to the current one is ticked; no dates except the order's own.
  const steps: OrderStatus[] = order.status === "cancelled" ? ["pending", "cancelled"] : STEPS
  const current = steps.indexOf(order.status)
  return (
    <ol aria-label={t.timeline} className="flex flex-col">
      {steps.map((step, i) => {
        const done = i <= current
        const now = i === current
        return (
          <li key={step} data-done={done} className="relative grid grid-cols-[1.25rem_1fr] gap-x-5 pb-8 last:pb-0">
            {i < steps.length - 1 && <span aria-hidden="true" className={cn("absolute start-2.25 top-4 bottom-0 w-px", done && !now ? "bg-primary" : "bg-primary/25")} />}
            <span
              aria-hidden="true"
              className={cn("relative mt-1.5 size-2.5 rotate-45 border ms-1", now ? "border-accent bg-accent" : done ? "border-primary bg-primary" : "border-primary/40 bg-background")}
            />
            <div className="flex flex-col gap-1">
              <h3 className={cn(done ? "text-foreground" : "text-muted-foreground")}>
                {t.timelineSteps[step].title}
                {now && ` · ${t.now}`}
              </h3>
              <p className="text-sm text-muted-foreground">{step === "pending" ? formatDate(order.createdAt) : t.timelineSteps[step].body}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// One order (prototype: Account, an order): progress, the pieces, the totals, where it goes, the gift, and Cancel
// while it is pending (the server puts the pieces back in stock).
export default function AccountOrder() {
  const { m, to } = useLocale()
  const t = m.orders
  const orders = useOrders()
  const [state, setOrder, retry] = useOrder(Number(useParams().id))
  const [asking, setAsking] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [said, setSaid] = useState<{ text: string; alert: boolean } | null>(null)
  const [failure, setFailure] = useState<Failure | null>(null)

  if (failure) return <OrderMissing state={failure} />
  if (state.status !== "ready") return <OrderMissing state={state} retry={retry} />
  const order = state.value

  const cancel = async () => {
    setCancelling(true)
    setSaid(null)
    try {
      setOrder(await orders.cancel(order.id))
      setSaid({ text: t.cancelled, alert: false })
    } catch (error) {
      if (!(error instanceof OrderError)) throw error
      if (error.code === "UNAUTHORIZED") {
        setFailure(failureOf(error))
        return
      }
      setSaid({ text: error.message, alert: true })
      // It changed elsewhere (Omar confirmed it, or another device cancelled it): show it as it is now.
      const now = await orders.get(order.id).catch(() => null)
      if (now) setOrder(now)
    } finally {
      setCancelling(false)
      setAsking(false)
    }
  }

  return (
    <section className="px-gutter pt-[clamp(3rem,7vw,6rem)] pb-section">
      <div className="mx-auto flex max-w-275 flex-col gap-12">
        <Link to={to("/account")} className={cn(caps, "flex min-h-11 w-max items-center gap-3")}>
          <MoveLeft aria-hidden="true" strokeWidth={1.1} className="size-4.5 rtl:-scale-x-100" />
          {t.allOrders}
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-display-m leading-none font-light">{interpolate(t.orderNumber, { number: order.number })}</h1>
            <p className="text-small text-muted-foreground">{interpolate(t.placed, { date: formatDate(order.createdAt) })}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="grid items-start gap-x-[clamp(3rem,7vw,7rem)] gap-y-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="flex flex-col gap-10">
            <Timeline order={order} />
            {said && (
              <p role={said.alert ? "alert" : "status"} className="text-small">
                {said.text}
              </p>
            )}
            {order.canCancel &&
              (asking ? (
                <div className="flex flex-col items-start gap-4 border-y border-border py-6">
                  <p className="text-small">{t.cancelAsk}</p>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" disabled={cancelling} onClick={cancel} className={cn(actionVariants({ variant: "solid" }), "disabled:opacity-60")}>
                      {cancelling ? t.cancelling : t.cancelYes}
                    </button>
                    <button type="button" disabled={cancelling} onClick={() => setAsking(false)} className={actionVariants({ variant: "outline" })}>
                      {t.cancelNo}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setAsking(true)} className={cn(actionVariants({ variant: "outline" }), "self-start")}>
                  {t.cancel}
                </button>
              ))}
          </div>

          <div className="flex flex-col gap-10">
            <section aria-labelledby="order-summary">
              <h2 id="order-summary" className={cn(caps, "border-b border-border pb-4")}>
                {t.summary}
              </h2>
              <OrderItems order={order} />
              <OrderTotals order={order} totalLabel={t.total} />
            </section>
            <DeliverTo order={order} />
            <GiftInfo order={order} />
            <p className="text-small text-muted-foreground">
              {t.questions}{" "}
              <Link to={to("/contact")} className="text-foreground underline underline-offset-4">
                {t.writeToUs}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
