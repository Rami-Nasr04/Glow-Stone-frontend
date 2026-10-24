import { useCallback, useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { useAdminAuth } from "@/features/studio/auth/admin-auth-context"
import { STUDIO_COPY } from "@/features/studio/copy"
import OrderRow, { OrderListHeader } from "@/features/studio/OrderRow"
import { type AdminOrderSummary, ORDER_STATUSES, type OrderStatus } from "@/features/studio/orders"
import { usePendingOrders } from "@/features/studio/pending-orders"
import { cn } from "@/lib/utils"

const t = STUDIO_COPY.orders

type Load = { state: "loading" } | { state: "failed" } | { state: "ready"; orders: AdminOrderSummary[] }

const isStatus = (value: string | null): value is OrderStatus => ORDER_STATUSES.some((status) => status === value)

export default function StudioOrders() {
  const { api } = useAdminAuth()
  const { report } = usePendingOrders()
  const [params] = useSearchParams()
  const wanted = params.get("status")
  const filter = isStatus(wanted) ? wanted : null
  const [load, setLoad] = useState<Load>({ state: "loading" })

  // A 401 has already ended the session; anything else can be tried again.
  const fetchList = useCallback(
    () =>
      api.listOrders().then(
        (orders): Load => {
          report(orders)
          return { state: "ready", orders }
        },
        (): Load => ({ state: "failed" }),
      ),
    [api, report],
  )

  useEffect(() => {
    let live = true
    void fetchList().then((next) => live && setLoad(next))
    return () => {
      live = false
    }
  }, [fetchList])

  const retry = () => {
    setLoad({ state: "loading" })
    void fetchList().then(setLoad)
  }

  const all = load.state === "ready" ? load.orders : []
  const shown = filter ? all.filter((order) => order.status === filter) : all
  const choices: { status: OrderStatus | null; label: string; count: number }[] = [
    { status: null, label: t.all, count: all.length },
    ...ORDER_STATUSES.map((status) => ({ status, label: STUDIO_COPY.status[status], count: all.filter((order) => order.status === status).length })),
  ]

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-4xl font-light lg:text-[2.75rem]">{t.title}</h1>

      <nav aria-label={t.filterLabel} className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <ul className="flex min-w-max gap-5 border-b border-border">
          {choices.map((choice) => {
            const on = choice.status === filter
            return (
              <li key={choice.status ?? "all"}>
                <Link
                  to={choice.status ? `?status=${choice.status}` : "."}
                  replace
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "-mb-px flex min-h-11 items-center gap-2 border-b text-label uppercase tracking-caps transition-colors duration-500",
                    on ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {choice.label}
                  <span className="text-xs tracking-normal text-muted-foreground">{load.state === "ready" ? choice.count : ""}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {load.state === "loading" && (
        <p role="status" className="py-6 text-sm text-muted-foreground">
          {t.loading}
        </p>
      )}
      {load.state === "failed" && (
        <div className="flex flex-wrap items-center gap-4 border border-border bg-studio-panel px-5 py-4">
          <p role="alert" className="text-sm text-destructive">
            {t.loadFailed}
          </p>
          <button type="button" onClick={retry} className="min-h-11 text-label uppercase tracking-caps underline underline-offset-4">
            {t.retry}
          </button>
        </div>
      )}
      {load.state === "ready" && (
        <section className="border border-border bg-studio-panel">
          <OrderListHeader />
          {shown.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">{filter ? t.emptyBy[filter] : t.empty}</p>
          ) : (
            <ul aria-label={t.title}>
              {shown.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
