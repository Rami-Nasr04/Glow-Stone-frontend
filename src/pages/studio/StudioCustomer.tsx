import { useCallback, useEffect, useState } from "react"
import { Link, useParams } from "react-router"
import { studioPath } from "@/config/studio"
import { StudioError } from "@/features/studio/admin-api"
import { useAdminAuth } from "@/features/studio/auth/admin-auth-context"
import { STUDIO_COPY } from "@/features/studio/copy"
import OrderRow, { OrderListHeader } from "@/features/studio/OrderRow"
import { ordersLabel } from "@/features/studio/order-labels"
import { type AdminCustomerDetail, callHref, formatDay, formatPhone, whatsappHref } from "@/features/studio/orders"
import { panel, panelTitle } from "@/features/studio/panel"
import { interpolate } from "@/i18n/format"
import { cn } from "@/lib/utils"

const t = STUDIO_COPY.customers

type Load = { state: "loading" } | { state: "failed" } | { state: "missing"; message: string } | { state: "ready"; customer: AdminCustomerDetail }

const contact = "flex min-h-11 items-center border border-primary px-4 text-label uppercase tracking-caps transition-colors duration-500 hover:bg-primary hover:text-primary-foreground"

export default function StudioCustomer() {
  const { id = "" } = useParams()
  const { api } = useAdminAuth()
  const [load, setLoad] = useState<Load>({ state: "loading" })

  const read = useCallback(
    () =>
      api.getCustomer(id).then(
        (customer): Load => ({ state: "ready", customer }),
        (error): Load => (error instanceof StudioError && error.code === "NOT_FOUND" ? { state: "missing", message: error.message } : { state: "failed" }),
      ),
    [api, id],
  )

  useEffect(() => {
    let live = true
    void read().then((next) => live && setLoad(next))
    return () => {
      live = false
    }
  }, [read])

  const retry = () => {
    setLoad({ state: "loading" })
    void read().then(setLoad)
  }

  const back = (
    <Link to={studioPath("/customers")} className="flex min-h-11 items-center gap-2.5 self-start text-label uppercase tracking-caps">
      ← {t.back}
    </Link>
  )

  if (load.state === "loading") {
    return (
      <p role="status" className="py-6 text-sm text-muted-foreground">
        {t.loadingOne}
      </p>
    )
  }
  if (load.state === "failed") {
    return (
      <div className="flex flex-col gap-5">
        {back}
        <div className="flex flex-wrap items-center gap-4 border border-border bg-studio-panel px-5 py-4">
          <p role="alert" className="text-sm text-destructive">
            {t.loadOneFailed}
          </p>
          <button type="button" onClick={retry} className="min-h-11 text-label uppercase tracking-caps underline underline-offset-4">
            {t.retry}
          </button>
        </div>
      </div>
    )
  }
  if (load.state === "missing") {
    return (
      <div className="flex flex-col gap-5">
        {back}
        <h1 className="font-display text-4xl font-light">{load.message}</h1>
      </div>
    )
  }

  const customer = load.customer
  return (
    <div className="flex flex-col gap-6">
      {back}
      <div className="flex flex-col gap-6">
        <section aria-labelledby="customer-name" className={cn(panel, "lg:max-w-xl")}>
          <div className="flex flex-col gap-1">
            <h1 id="customer-name" className="font-display text-4xl font-light">
              {customer.name}
            </h1>
            <span className="text-sm text-muted-foreground">{interpolate(t.since, { date: formatDay(customer.createdAt) })}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span>{formatPhone(customer.phone)}</span>
            <a href={`mailto:${customer.email}`} className="self-start break-all text-accent underline underline-offset-4">
              {customer.email}
            </a>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={callHref(customer.phone)} className={contact}>
              {STUDIO_COPY.order.call}
            </a>
            <a href={whatsappHref(customer.phone)} target="_blank" rel="noopener noreferrer" className={contact}>
              {STUDIO_COPY.order.whatsapp}
            </a>
          </div>
          <p className="border-t border-border pt-4 text-sm">{ordersLabel(customer.orders.length)}</p>
        </section>

        <section aria-labelledby="customer-history" className="flex flex-col gap-3">
          <h2 id="customer-history" className={panelTitle}>
            {t.history}
          </h2>
          <div className="border border-border bg-studio-panel">
            {customer.orders.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">{t.noOrders}</p>
            ) : (
              <>
                <OrderListHeader />
                <ul aria-label={t.history}>
                  {customer.orders.map((order) => (
                    <OrderRow key={order.id} order={order} />
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
