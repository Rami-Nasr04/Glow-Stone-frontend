import { useCallback, useEffect, useState } from "react"
import { Link, useLocation, useParams } from "react-router"
import { Field, inputClass } from "@/components/ui/field"
import { studioPath } from "@/config/studio"
import NoPhoto from "@/features/catalog/NoPhoto"
import { StudioError } from "@/features/studio/admin-api"
import { useAdminAuth } from "@/features/studio/auth/admin-auth-context"
import { STUDIO_COPY } from "@/features/studio/copy"
import { GiftMark } from "@/features/studio/OrderRow"
import { type AdminOrder, callHref, formatMoney, formatOrderTime, formatPhone, ORDER_FLOW, whatsappHref } from "@/features/studio/orders"
import { panel, panelTitle } from "@/features/studio/panel"
import { usePendingOrders } from "@/features/studio/pending-orders"
import StatusBadge from "@/features/studio/StatusBadge"
import { studioToast } from "@/features/studio/toast"
import { interpolate } from "@/i18n/format"
import { photoUrl } from "@/lib/images"
import { cn } from "@/lib/utils"

const t = STUDIO_COPY.order

type Load = { state: "loading" } | { state: "failed" } | { state: "missing"; message: string } | { state: "ready"; order: AdminOrder }

// The API's refusals are shown as it words them (Rami's rule): a 409 (another tab, a skipped step), a 400, a 404.
const isRefusal = (error: unknown): error is StudioError =>
  error instanceof StudioError && (error.code === "CONFLICT" || error.code === "VALIDATION" || error.code === "NOT_FOUND")

const button = "flex min-h-12 items-center justify-center px-6 text-label uppercase tracking-caps transition-colors duration-500 disabled:opacity-60"
const solid = cn(button, "bg-primary text-primary-foreground enabled:hover:bg-primary-hover")
const outline = cn(button, "border border-primary enabled:hover:bg-primary enabled:hover:text-primary-foreground")
const quiet = cn(button, "border border-transparent underline underline-offset-4")
const contact = "flex min-h-11 items-center border border-primary px-4 text-label uppercase tracking-caps transition-colors duration-500 hover:bg-primary hover:text-primary-foreground"

export default function StudioOrder() {
  const { id = "" } = useParams()
  const { state } = useLocation()
  const { api } = useAdminAuth()
  const pending = usePendingOrders()
  const [load, setLoad] = useState<Load>({ state: "loading" })
  // Each step and the cancel are asked on the page first: each one emails the customer (Rami, 2026-10-24).
  const [asking, setAsking] = useState<"step" | "cancel" | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const back = `${studioPath("/orders")}${typeof state === "object" && state && "back" in state && typeof state.back === "string" ? state.back : ""}`

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

  const retry = () => {
    setLoad({ state: "loading" })
    void read().then(setLoad)
  }

  // After any change the order on screen is the one the API sent back. A refusal means it changed elsewhere, so it
  // is read again under the API's words.
  const change = async (send: () => Promise<AdminOrder>, done: (order: AdminOrder) => string) => {
    setBusy(true)
    setNotice(null)
    try {
      const order = await send()
      setLoad({ state: "ready", order })
      studioToast.success(done(order))
      pending.refresh()
    } catch (error) {
      if (isRefusal(error)) {
        setNotice(error.message)
        const next = await read()
        if (next.state === "ready") setLoad(next)
        pending.refresh()
      } else if (!(error instanceof StudioError && error.status === 401)) {
        // A 401 has already sent the admin to sign in.
        studioToast.error(t.saveFailed)
      }
    } finally {
      setAsking(null)
      setBusy(false)
    }
  }

  if (load.state === "loading") {
    return (
      <p role="status" className="py-6 text-sm text-muted-foreground">
        {t.loading}
      </p>
    )
  }
  if (load.state === "failed") {
    return (
      <div className="flex flex-col gap-5">
        <BackLink to={back} />
        <div className="flex flex-wrap items-center gap-4 border border-border bg-studio-panel px-5 py-4">
          <p role="alert" className="text-sm text-destructive">
            {t.loadFailed}
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
        <BackLink to={back} />
        <h1 className="font-display text-4xl font-light">{load.message}</h1>
      </div>
    )
  }

  const order = load.order
  const next = order.nextStatus
  const buyer = order.customer.name
  const payment = order.isGift ? interpolate(t.payment, { name: buyer }) : null
  const pieces = order.items.map((line) => `${line.name} × ${line.quantity}`).join(", ")

  return (
    <div className="flex flex-col gap-6">
      <BackLink to={back} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-4xl font-light lg:text-[2.75rem]">{order.number}</h1>
          <p className="text-sm text-muted-foreground">{interpolate(order.isGift ? t.placedGift : t.placed, { time: formatOrderTime(order.createdAt) })}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <section aria-label={t.timeline} className={panel}>
        <Timeline order={order} />
        {order.status === "cancelled" && <p className="text-sm text-muted-foreground">{t.wasCancelled}</p>}
        {notice && (
          <p role="alert" className="border-s-2 border-accent ps-3 text-sm">
            {notice}
          </p>
        )}

        {asking === "step" && next ? (
          <InlineConfirm
            question={interpolate(t.steps[next].question, { name: buyer })}
            yes={busy ? t.updating : t.steps[next].yes}
            no={t.notNow}
            busy={busy}
            onYes={() =>
              void change(
                () => api.advanceOrder(order.id, next),
                (after) => interpolate(t.steps[next].done, { number: after.number }),
              )
            }
            onNo={() => setAsking(null)}
          />
        ) : asking === "cancel" ? (
          <InlineConfirm
            question={interpolate(t.cancelQuestion, { number: order.number, pieces, name: buyer })}
            yes={busy ? t.cancelling : t.cancelYes}
            no={t.keep}
            busy={busy}
            danger
            onYes={() =>
              void change(
                () => api.cancelOrder(order.id),
                (after) => interpolate(t.cancelledToast, { number: after.number }),
              )
            }
            onNo={() => setAsking(null)}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {next && (
              <button type="button" onClick={() => setAsking("step")} className={cn(solid, "max-sm:flex-1")}>
                {t.steps[next].action}
              </button>
            )}
            <a href={studioPath(`/orders/${order.id}/slip`)} target="_blank" rel="noopener" className={cn(outline, "max-sm:flex-1")}>
              {t.printSlip}
            </a>
            {order.canCancel && (
              <button type="button" onClick={() => setAsking("cancel")} className={cn(quiet, "text-accent max-sm:flex-1")}>
                {t.cancel}
              </button>
            )}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
        <section aria-labelledby="order-items" className={panel}>
          <h2 id="order-items" className={panelTitle}>
            {t.items}
          </h2>
          <ul className="flex flex-col">
            {order.items.map((line) => (
              <li key={line.productId} className="flex items-center gap-4 border-b border-border py-3 first:pt-0">
                <div className="h-15 w-10 flex-none overflow-hidden bg-muted">
                  {line.image ? (
                    <img src={photoUrl(line.image, 480)} alt="" width={line.image.width} height={line.image.height} loading="lazy" className="size-full object-contain" />
                  ) : (
                    <NoPhoto />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-display text-xl leading-tight">{line.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {interpolate(t.line, { stone: line.stoneType, color: line.color, quantity: line.quantity })}
                  </span>
                </div>
                <span>{formatMoney(line.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <ul aria-label={t.totals} className="flex flex-col gap-2 text-sm">
            <li className="flex justify-between gap-4">
              <span>{t.subtotal}</span>
              <span>{formatMoney(order.subtotal)}</span>
            </li>
            <li className="flex justify-between gap-4">
              <span>{t.delivery}</span>
              <span>{order.deliveryFee === 0 ? t.free : formatMoney(order.deliveryFee)}</span>
            </li>
            <li className="flex justify-between gap-4 border-t border-border pt-3 text-base font-medium">
              <span>{order.isGift ? t.totalGift : t.total}</span>
              <span>{formatMoney(order.total)}</span>
            </li>
          </ul>
          {payment && <p className="border-s-2 border-accent ps-3 text-sm">{payment}</p>}
          {order.canEditFee && <FeeEditor key={order.deliveryFee} order={order} onSaved={(after) => setLoad({ state: "ready", order: after })} />}
        </section>

        <div className="flex flex-col gap-6">
          <section aria-labelledby="order-customer" className={panel}>
            <h2 id="order-customer" className={panelTitle}>
              {t.customer}
            </h2>
            <div className="flex flex-col gap-1">
              <Link to={studioPath(`/customers/${encodeURIComponent(order.customer.id)}`)} className="font-display text-2xl leading-tight hover:text-accent">
                {buyer}
              </Link>
              <span>{formatPhone(order.customer.phone)}</span>
              <a href={`mailto:${order.customer.email}`} className="self-start text-accent underline underline-offset-4">
                {order.customer.email}
              </a>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={callHref(order.customer.phone)} className={contact}>
                {t.call}
              </a>
              <a href={whatsappHref(order.customer.phone)} target="_blank" rel="noopener noreferrer" className={contact}>
                {t.whatsapp}
              </a>
            </div>
          </section>

          <section aria-labelledby="order-deliver" className={panel}>
            <h2 id="order-deliver" className={panelTitle}>
              {t.deliverTo}
            </h2>
            <div className="flex flex-col gap-1">
              {order.recipient.isAccountHolder ? (
                <span className="text-muted-foreground">{t.accountHolder}</span>
              ) : (
                <>
                  <span className="font-medium">{order.recipient.name}</span>
                  <span>{formatPhone(order.recipient.phone)}</span>
                </>
              )}
              <span>{order.address}</span>
              <span>{order.city}</span>
            </div>
            {!order.recipient.isAccountHolder && (
              <a href={callHref(order.recipient.phone)} className={cn(contact, "self-start")}>
                {t.callRecipient}
              </a>
            )}
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-label uppercase tracking-label text-muted-foreground">{t.notes}</span>
              <span>{order.deliveryNotes ?? t.noNotes}</span>
            </div>
          </section>

          <section aria-labelledby="order-gift" className={panel}>
            <h2 id="order-gift" className={panelTitle}>
              {t.gift}
            </h2>
            {order.isGift ? (
              <>
                <GiftMark />
                <p className="font-display text-xl italic">{order.giftMessage ? `“${order.giftMessage}”` : t.noCard}</p>
                <p className="text-sm text-muted-foreground">{t.pricesHidden}</p>
                <p className="border-s-2 border-accent ps-3 text-sm">{payment}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t.notGift}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

interface BackLinkProps {
  to: string
}

function BackLink({ to }: BackLinkProps) {
  return (
    <Link to={to} className="flex min-h-11 items-center gap-2.5 self-start text-label uppercase tracking-caps">
      ← {t.back}
    </Link>
  )
}

interface TimelineProps {
  order: AdminOrder
}

// Placed → Confirmed → Out for delivery → Delivered, ticked up to the current step; a cancelled order is Placed → Cancelled.
function Timeline({ order }: TimelineProps) {
  const steps = order.status === "cancelled" ? (["pending", "cancelled"] as const) : ORDER_FLOW
  const at = steps.indexOf(order.status)
  return (
    <ol className="flex flex-wrap gap-x-6 gap-y-2">
      {steps.map((step, i) => {
        const done = i <= at
        return (
          <li key={step} aria-current={i === at ? "step" : undefined} className={cn("flex items-center gap-2 text-sm", done ? "text-foreground" : "text-muted-foreground")}>
            <span aria-hidden="true" className={cn("size-2.5 rounded-full border", i === at ? "border-accent bg-accent" : done ? "border-primary bg-primary" : "border-muted-foreground")} />
            {step === "pending" ? t.placedStep : STUDIO_COPY.status[step]}
          </li>
        )
      })}
    </ol>
  )
}

interface InlineConfirmProps {
  question: string
  yes: string
  no: string
  busy: boolean
  /** The yes button in wine (a cancel). */
  danger?: boolean
  onYes: () => void
  onNo: () => void
}

// Asked on the same screen, not in a pop-up (Rami, 2026-10-24). The question takes the buttons' place.
function InlineConfirm({ question, yes, no, busy, danger = false, onYes, onNo }: InlineConfirmProps) {
  return (
    <div className="flex flex-col gap-3 border border-primary bg-background/40 p-4">
      <p className="text-small">{question}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onYes}
          className={cn(button, "max-sm:flex-1", danger ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground enabled:hover:bg-primary-hover")}
        >
          {yes}
        </button>
        <button type="button" disabled={busy} onClick={onNo} className={cn(outline, "max-sm:flex-1")}>
          {no}
        </button>
      </div>
    </div>
  )
}

interface FeeEditorProps {
  order: AdminOrder
  onSaved: (order: AdminOrder) => void
}

const FEE = /^\d{1,5}(\.\d{1,2})?$/
const feeText = (fee: number) => (Number.isInteger(fee) ? String(fee) : fee.toFixed(2))

// Only while the order is pending: Omar agrees the fee on his confirmation call. The fee sends no email.
function FeeEditor({ order, onSaved }: FeeEditorProps) {
  const { api } = useAdminAuth()
  const [value, setValue] = useState(feeText(order.deliveryFee))
  const [error, setError] = useState<{ text: string; fromApi: boolean } | null>(null)
  const [saving, setSaving] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const typed = value.trim()
    if (!FEE.test(typed) || Number(typed) > 10_000) {
      setError({ text: t.feeInvalid, fromApi: false })
      return
    }
    setError(null)
    setSaving(true)
    try {
      onSaved(await api.setDeliveryFee(order.id, Number(typed)))
      studioToast.success(t.feeSaved)
    } catch (failure) {
      if (isRefusal(failure)) setError({ text: failure.message, fromApi: true })
      else if (!(failure instanceof StudioError && failure.status === 401)) studioToast.error(t.saveFailed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form noValidate onSubmit={(e) => void save(e)} className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field id="order-fee" label={t.feeLabel} error={error?.text} announce={error?.fromApi} className="w-40">
          {(control) => <input inputMode="decimal" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} className={inputClass} {...control} />}
        </Field>
        <button type="submit" disabled={saving} className={outline}>
          {saving ? t.feeSaving : t.feeSave}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">{t.feeHint}</p>
    </form>
  )
}
