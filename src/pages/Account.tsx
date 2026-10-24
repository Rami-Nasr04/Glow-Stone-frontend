import { Tabs } from "radix-ui"
import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"
import Picture from "@/components/media/Picture"
import { ActionLink } from "@/components/ui/action-link"
import { useAuth } from "@/features/auth/auth-context"
import { internationalPhone } from "@/features/auth/rules"
import NoPhoto from "@/features/catalog/NoPhoto"
import { useOrders } from "@/features/orders/client"
import { StatusBadge } from "@/features/orders/OrderParts"
import type { Me, OrderSummary } from "@/features/orders/types"
import { type Failure, failureOf } from "@/features/orders/use-order"
import { formatDate, formatPrice, interpolate } from "@/i18n/format"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"
import OrderMissing from "./OrderMissing"

const caps = "text-label uppercase tracking-label"

type Remote = { status: "loading" } | { status: "ready"; me: Me; orders: OrderSummary[] } | Failure

const tab = cn(caps, "flex min-h-11 items-center border-b border-transparent text-muted-foreground transition-colors duration-500 data-[state=active]:border-accent data-[state=active]:text-foreground")

// My account (prototype: Account): the orders and the profile (read only for now). No saved addresses.
export default function Account() {
  const { m, to } = useLocale()
  const t = m.orders
  const orders = useOrders()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [state, setState] = useState<Remote>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let live = true
    Promise.all([orders.me(), orders.list()]).then(
      ([me, list]) => live && setState({ status: "ready", me, orders: list }),
      (error: unknown) => live && setState(failureOf(error)),
    )
    return () => {
      live = false
    }
  }, [orders, attempt])

  if (state.status !== "ready") {
    return (
      <OrderMissing
        state={state}
        retry={() => {
          setState({ status: "loading" })
          setAttempt((n) => n + 1)
        }}
      />
    )
  }

  const leave = async () => {
    await signOut()
    navigate(to("/"))
  }

  return (
    <section className="px-gutter pt-[clamp(3rem,7vw,6rem)] pb-section">
      <div className="mx-auto flex max-w-275 flex-col gap-12">
        <div className="flex flex-col gap-4">
          <p className={caps}>{t.myAccount}</p>
          <h1 className="font-display text-display-xl leading-none font-light">{interpolate(t.hello, { name: state.me.name.split(" ")[0] })}</h1>
        </div>

        <Tabs.Root defaultValue="orders" className="flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-x-12 border-b border-border">
            <Tabs.List aria-label={t.myAccount} className="flex gap-12">
              <Tabs.Trigger value="orders" className={tab}>
                {t.tabs.orders}
              </Tabs.Trigger>
              <Tabs.Trigger value="profile" className={tab}>
                {t.tabs.profile}
              </Tabs.Trigger>
            </Tabs.List>
            <button type="button" onClick={leave} className={cn(caps, "flex min-h-11 items-center text-muted-foreground hover:text-foreground")}>
              {t.signOut}
            </button>
          </div>

          <Tabs.Content value="orders" className="pt-6">
            {state.orders.length === 0 ? (
              <div className="flex flex-col items-start gap-5 py-12">
                <p className="font-display text-3xl font-light">{t.noOrders}</p>
                <p className="text-small text-muted-foreground">{t.noOrdersNote}</p>
                <ActionLink to={to("/collection")}>{t.viewCollection}</ActionLink>
              </div>
            ) : (
              <ul>
                {state.orders.map((order) => (
                  <li key={order.id} className="border-b border-border">
                    <Link
                      to={to(`/account/orders/${order.id}`)}
                      aria-label={`${interpolate(t.orderNumber, { number: order.number })}, ${formatDate(order.createdAt)}, ${t.status[order.status]}`}
                      className="grid grid-cols-[3.5rem_1fr] items-center gap-x-6 gap-y-3 py-6 transition-colors duration-500 hover:bg-card/60 sm:grid-cols-[3.5rem_10rem_1fr_6rem_auto]"
                    >
                      <span className="relative row-span-2 aspect-2/3 w-14 overflow-hidden bg-card sm:row-span-1">
                        {order.image ? <Picture image={order.image} alt="" sizes="56px" /> : <NoPhoto />}
                      </span>
                      <span className="flex flex-col gap-1">
                        <span className={caps}>{order.number}</span>
                        <span className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</span>
                      </span>
                      <span className="font-display text-xl font-light max-sm:col-start-2">
                        {order.items
                          .map(({ name, quantity }) => (quantity > 1 ? interpolate(t.nameTimes, { name, count: quantity }) : name))
                          .join(t.listSeparator)}
                      </span>
                      <span className="text-sm tracking-price max-sm:col-start-2">{formatPrice(order.total)}</span>
                      <StatusBadge status={order.status} className="max-sm:col-start-2" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Tabs.Content>

          <Tabs.Content value="profile" className="pt-10">
            <dl className="flex max-w-140 flex-col">
              {[
                [t.name, state.me.name],
                [t.email, state.me.email],
                [t.phone, internationalPhone(state.me.phone)],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col gap-2 border-b border-border py-5">
                  <dt className={cn(caps, "text-muted-foreground")}>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-small text-muted-foreground">{t.profileNote}</p>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </section>
  )
}
