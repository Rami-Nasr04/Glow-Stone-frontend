import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router"
import { studioPath } from "@/config/studio"
import { useAdminAuth } from "@/features/studio/auth/admin-auth-context"
import { STUDIO_COPY } from "@/features/studio/copy"
import { ordersLabel } from "@/features/studio/order-labels"
import { type AdminCustomer, formatDay, formatPhone } from "@/features/studio/orders"
import { cn } from "@/lib/utils"

const t = STUDIO_COPY.customers

// Only what the API returns (Rami, 2026-10-24): no total spent, no address. Desktop: name, email, phone, joined,
// orders. Phones: name and the order count, then phone · email · joined.
const columns = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_10rem_8rem_7rem]"

type Load = { state: "loading" } | { state: "failed" } | { state: "ready"; customers: AdminCustomer[] }

export default function StudioCustomers() {
  const { api } = useAdminAuth()
  const [load, setLoad] = useState<Load>({ state: "loading" })

  // A 401 has already ended the session; anything else can be tried again.
  const fetchList = useCallback(
    () =>
      api.listCustomers().then(
        (customers): Load => ({ state: "ready", customers }),
        (): Load => ({ state: "failed" }),
      ),
    [api],
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

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-4xl font-light lg:text-[2.75rem]">{t.title}</h1>
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
          <div aria-hidden="true" className={cn(columns, "hidden border-b border-border px-5 py-3 text-label uppercase tracking-caps text-muted-foreground lg:grid")}>
            <span>{t.columns.name}</span>
            <span>{t.columns.email}</span>
            <span>{t.columns.phone}</span>
            <span>{t.columns.joined}</span>
            <span className="text-end">{t.columns.orders}</span>
          </div>
          {load.customers.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">{t.empty}</p>
          ) : (
            <ul aria-label={t.title}>
              {load.customers.map((customer) => (
                <li key={customer.id} className="border-b border-border last:border-b-0">
                  <Link
                    to={studioPath(`/customers/${encodeURIComponent(customer.id)}`)}
                    className={cn(columns, "px-5 py-3 transition-colors duration-500 hover:bg-studio-surface/60")}
                  >
                    <span className="truncate font-display text-xl leading-tight">{customer.name}</span>
                    <span className="hidden truncate text-sm lg:block">{customer.email}</span>
                    <span className="hidden text-sm lg:block">{formatPhone(customer.phone)}</span>
                    <span className="hidden text-sm text-muted-foreground lg:block">{formatDay(customer.createdAt)}</span>
                    <span className="text-end text-sm">{ordersLabel(customer.orderCount)}</span>
                    <span className="col-span-2 flex flex-wrap gap-x-2 text-xs text-muted-foreground lg:hidden">
                      <span>{formatPhone(customer.phone)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="break-all">{customer.email}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatDay(customer.createdAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
