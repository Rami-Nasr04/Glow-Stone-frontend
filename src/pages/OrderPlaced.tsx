import { useLocation, useParams } from "react-router"
import { ActionLink } from "@/components/ui/action-link"
import { Rule } from "@/components/ui/rule"
import { DeliverTo, GiftInfo, OrderItems, OrderTotals } from "@/features/orders/OrderParts"
import { useOrder } from "@/features/orders/use-order"
import type { Order } from "@/features/orders/types"
import { interpolate } from "@/i18n/format"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"
import OrderMissing from "./OrderMissing"

const caps = "text-label uppercase tracking-label"

// The confirmation after a 201 (prototype: Confirmation). Checkout hands the order over; a reload reads it again.
export default function OrderPlaced() {
  const { m, to } = useLocale()
  const t = m.orders
  const id = Number(useParams().id)
  const handed = (useLocation().state as { order?: Order } | null)?.order
  const [state, , retry] = useOrder(id, handed)

  if (state.status !== "ready") return <OrderMissing state={state} retry={retry} />
  const order = state.value

  return (
    <section className="px-gutter pt-[clamp(3.5rem,8vw,7rem)] pb-section">
      <div className="mx-auto flex max-w-275 flex-col gap-[clamp(3.5rem,7vw,6rem)]">
        <div className="flex flex-col items-center gap-6 text-center">
          <img src="/brand/glowstone-monogram.svg" alt="" width={36} height={36} className="size-9" />
          <h1 className="font-display text-display-xl leading-none font-light">{t.thanks}</h1>
          <Rule />
          <p className={caps}>{interpolate(t.orderNumber, { number: order.number })}</p>
          <p className="max-w-120 text-pretty">{t.willCall}</p>
        </div>

        <ol aria-label={t.nextSteps} className="grid gap-10 border-t border-border sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {t.steps.map((step, i) => (
            <li key={step.title} className={cn("flex flex-col gap-3 pt-8", i === 0 && "border-t border-accent -mt-px")}>
              <span className={cn(caps, "text-muted-foreground")}>
                {String(i + 1).padStart(2, "0")} · {step.when}
              </span>
              <h2 className="font-display text-2xl font-light">{step.title}</h2>
              <p className="text-small text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="grid items-start gap-x-[clamp(3rem,7vw,7rem)] gap-y-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <section aria-labelledby="placed-summary">
            <h2 id="placed-summary" className={cn(caps, "border-b border-border pb-4")}>
              {t.summary}
            </h2>
            <OrderItems order={order} />
            <OrderTotals order={order} totalLabel={t.totalCod} />
          </section>
          <div className="flex flex-col gap-10">
            <DeliverTo order={order} />
            <GiftInfo order={order} />
            <div className="flex flex-col gap-3">
              <ActionLink to={to("/account")} variant="solid" size="lg" className="w-full">
                {t.viewOrders}
              </ActionLink>
              <ActionLink to={to("/collection")} size="lg" arrow={false} className="w-full">
                {t.continueBrowsing}
              </ActionLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
