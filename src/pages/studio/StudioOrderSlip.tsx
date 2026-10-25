import { useCallback, useEffect, useState } from "react"
import { Link, useParams } from "react-router"
import { CONTACT_EMAIL } from "@/config/site"
import { studioPath } from "@/config/studio"
import { StudioError } from "@/features/studio/admin-api"
import { useAdminAuth } from "@/features/studio/auth/admin-auth-context"
import { STUDIO_COPY } from "@/features/studio/copy"
import { type AdminOrder, formatDay, formatMoney, formatPhone } from "@/features/studio/orders"
import { interpolate } from "@/i18n/format"
import { cn } from "@/lib/utils"

const t = STUDIO_COPY.slip

type Load = { state: "loading" } | { state: "failed" } | { state: "missing"; message: string } | { state: "ready"; order: AdminOrder }

const label = "text-label uppercase tracking-label text-muted-foreground"

// The page Omar prints and hands over with the piece, as the prototype's A5 slip. It goes to the recipient: for a gift
// every price is left out and there is no payment line (the buyer pays Omar, not the recipient; Rami, 2026-10-24).
export default function StudioOrderSlip() {
  const { id = "" } = useParams()
  const { api } = useAdminAuth()
  const [load, setLoad] = useState<Load>({ state: "loading" })

  const read = useCallback(
    () =>
      api.getOrder(Number(id)).then(
        (order): Load => ({ state: "ready", order }),
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

  const back = (
    <Link to={studioPath(`/orders/${id}`)} className="flex min-h-11 items-center gap-2.5 text-label uppercase tracking-caps">
      ← {t.back}
    </Link>
  )

  return (
    <div className="min-h-svh bg-studio-surface px-4 py-6 print:bg-transparent print:p-0">
      <div className="mx-auto flex max-w-[148mm] flex-col gap-5">
        <div data-print-hide className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          {back}
          {load.state === "ready" && (
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-xs text-muted-foreground">{t.printHint}</span>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex min-h-11 items-center bg-primary px-6 text-label uppercase tracking-caps text-primary-foreground transition-colors duration-500 hover:bg-primary-hover"
              >
                {t.print}
              </button>
            </div>
          )}
        </div>

        {load.state === "loading" && (
          <p role="status" className="text-sm text-muted-foreground">
            {t.loading}
          </p>
        )}
        {load.state === "failed" && (
          <p role="alert" className="text-sm text-destructive">
            {t.loadFailed}
          </p>
        )}
        {load.state === "missing" && <h1 className="font-display text-4xl font-light">{load.message}</h1>}
        {load.state === "ready" && <Slip order={load.order} />}
      </div>
    </div>
  )
}

interface SlipProps {
  order: AdminOrder
}

function Slip({ order }: SlipProps) {
  const prices = !order.isGift
  return (
    <article
      data-slip
      aria-label={`${t.title} ${order.number}`}
      className="flex min-h-[210mm] flex-col gap-7 bg-studio-panel p-[12mm] text-foreground print:min-h-0 print:bg-transparent print:p-0"
    >
      <header className="flex items-start justify-between gap-4 border-b border-primary pb-5">
        <img src="/brand/glowstone-wordmark.svg" alt="Glowstone" width={1004} height={137} className="h-auto w-44 min-w-0 shrink" />
        <div className="flex shrink-0 flex-col items-end gap-1 text-end">
          <h1 className={cn(label, "whitespace-nowrap")}>{t.title}</h1>
          <span className="font-display text-2xl whitespace-nowrap">{order.number}</span>
          <span className="text-xs text-muted-foreground">{formatDay(order.createdAt)}</span>
        </div>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-6">
        <div className="flex flex-col gap-1">
          <span className={label}>{t.deliverTo}</span>
          <span className="font-display text-xl">{order.recipient.name}</span>
          <span>{formatPhone(order.recipient.phone)}</span>
          <span>{order.address}</span>
          <span>{order.city}</span>
        </div>
        {prices && (
          <div className="flex flex-col items-end gap-1 text-end">
            <span className={label}>{t.payment}</span>
            <span>{t.cash}</span>
            <span className="font-display text-xl">{formatMoney(order.total)}</span>
          </div>
        )}
      </div>

      {order.deliveryNotes && (
        <div className="flex flex-col gap-1">
          <span className={label}>{t.notes}</span>
          <span className="text-sm">{order.deliveryNotes}</span>
        </div>
      )}

      <table aria-label={t.pieces} className="w-full border-collapse text-sm">
        <thead>
          <tr className={cn(label, "border-b border-primary")}>
            <th scope="col" className="py-2 text-start font-normal">
              {t.piece}
            </th>
            <th scope="col" className="w-14 py-2 text-end font-normal">
              {t.qty}
            </th>
            {prices && (
              <th scope="col" className="w-24 py-2 text-end font-normal">
                {t.price}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {order.items.map((line) => (
            <tr key={line.productId} className="border-b border-border">
              <td className="py-2.5">
                <span className="block font-display text-lg leading-tight">{line.name}</span>
                <span className="block text-xs text-muted-foreground">{`${line.stoneType} · ${line.color}`}</span>
              </td>
              <td className="py-2.5 text-end align-top">{line.quantity}</td>
              {prices && <td className="py-2.5 text-end align-top">{formatMoney(line.lineTotal)}</td>}
            </tr>
          ))}
        </tbody>
      </table>

      {order.isGift && order.giftMessage && (
        <section aria-labelledby="slip-gift" className="flex flex-col gap-2 border-y border-border py-5 text-center">
          <h2 id="slip-gift" className={label}>
            {t.giftTitle}
          </h2>
          <p className="font-display text-2xl italic">{`“${order.giftMessage}”`}</p>
        </section>
      )}

      <div className="mt-auto flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-8">
          <span className={cn(label, "border-t border-primary pt-2")}>{t.receivedBy}</span>
          <span className={cn(label, "border-t border-primary pt-2")}>{t.date}</span>
        </div>
        <p className="text-center text-xs text-muted-foreground">{interpolate(t.footer, { email: CONTACT_EMAIL })}</p>
      </div>
    </article>
  )
}
