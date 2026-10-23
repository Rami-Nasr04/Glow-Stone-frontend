import { MoveRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router"
import Picture from "@/components/media/Picture"
import { actionVariants } from "@/components/ui/action-link"
import { Field, inputClass } from "@/components/ui/field"
import { internationalPhone, lebanesePhone } from "@/features/auth/rules"
import { clearCart, noteStock, showCartNotice, useCart } from "@/features/cart/cart"
import { listProducts } from "@/features/catalog/catalog"
import { noBreak, stoneLabel } from "@/features/catalog/format"
import NoPhoto from "@/features/catalog/NoPhoto"
import type { ProductSummary } from "@/features/catalog/types"
import { useOrders } from "@/features/orders/client"
import { type Me, OrderError } from "@/features/orders/types"
import { type Failure, failureOf } from "@/features/orders/use-order"
import { formatPrice, interpolate } from "@/i18n/format"
import { useLocale } from "@/i18n/useLocale"
import { cn } from "@/lib/utils"
import OrderMissing from "./OrderMissing"

type Key = "theirName" | "theirPhone" | "city" | "street" | "floor" | "notes" | "giftMessage"
type Errors = Partial<Record<Key, string>>

// The contract's limits (city ≤ 100, address ≤ 300, notes ≤ 500, card ≤ 200).
const MAX = { city: 100, address: 300, notes: 500, giftMessage: 200 } as const
const ORDER: Key[] = ["theirName", "theirPhone", "city", "street", "floor", "notes"]

const caps = "text-label uppercase tracking-label"
const card = "flex cursor-pointer items-start gap-4 border border-primary/40 p-5 transition-colors duration-500 has-checked:border-primary has-checked:bg-card"
const radioDot = "mt-0.5 size-4 shrink-0 accent-accent"

type Remote<T> = { status: "loading" } | { status: "ready"; value: T } | { status: "failed" }

function SectionTitle({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <h2 className={cn(caps, "flex gap-4")}>
      <span className="text-muted-foreground">{n}</span>
      {children}
    </h2>
  )
}

// Checkout (prototype: Checkout), signed in only (RequireAuth). The cart's lines with the latest prices; the address
// is typed for each order (no saved addresses). The server prices and checks the order again; when it refuses
// because of a piece, the customer goes back to the cart with its words.
export default function Checkout() {
  const { m, to } = useLocale()
  const t = m.checkout
  const navigate = useNavigate()
  const orders = useOrders()
  const { lines, open: cartOpen } = useCart()
  const formRef = useRef<HTMLFormElement>(null)

  const [me, setMe] = useState<Remote<Me> | Failure>({ status: "loading" })
  const [pieces, setPieces] = useState<Remote<ReadonlyMap<number, ProductSummary>>>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)
  const [receiver, setReceiver] = useState<"me" | "someoneElse">("me")
  const [fields, setFields] = useState<Record<Key, string>>({ theirName: "", theirPhone: "", city: "", street: "", floor: "", notes: "", giftMessage: "" })
  const [gift, setGift] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [refusal, setRefusal] = useState<{ message: string; contact: boolean } | null>(null)
  const [placing, setPlacing] = useState(false)

  useEffect(() => {
    let live = true
    orders.me().then(
      (value) => live && setMe({ status: "ready", value }),
      (error: unknown) => live && setMe(failureOf(error)),
    )
    return () => {
      live = false
    }
  }, [orders, attempt])

  // The latest prices and stock, read again whenever the cart drawer closes (it may have changed the cart).
  useEffect(() => {
    if (cartOpen) return
    const abort = new AbortController()
    listProducts(abort.signal).then(
      (list) => {
        noteStock(new Map(list.map((piece) => [piece.id, piece.remaining])))
        setPieces({ status: "ready", value: new Map(list.map((piece) => [piece.id, piece])) })
      },
      () => {
        if (!abort.signal.aborted) setPieces({ status: "failed" })
      },
    )
    return () => abort.abort()
  }, [cartOpen, attempt])

  const set = (key: Key) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFields({ ...fields, [key]: e.target.value })
    // A field's message goes as soon as it is edited; the rest wait for the next try.
    if (errors[key]) setErrors({ ...errors, [key]: undefined })
  }
  const retry = () => {
    setMe({ status: "loading" })
    setPieces({ status: "loading" })
    setAttempt((n) => n + 1)
  }

  if (me.status === "loading" || pieces.status === "loading") {
    return (
      <p role="status" className="px-gutter py-24 text-center text-muted-foreground">
        {t.loading}
      </p>
    )
  }
  // The API refused the session (sign in again and come back) or the account (its words).
  if (me.status === "signIn" || me.status === "refused") return <OrderMissing state={me} />
  if (me.status === "failed") {
    return (
      <section className="mx-auto flex max-w-110 flex-col items-center gap-6 px-gutter py-24 text-center">
        <p role="alert">{t.loadFailed}</p>
        <button type="button" onClick={retry} className={actionVariants({ variant: "outline" })}>
          {t.retry}
        </button>
      </section>
    )
  }

  const known = pieces.status === "ready" ? pieces.value : null
  // Display only: unitPrice is sent as shown, and the server refuses the order if a price has changed since.
  const orderable = known
    ? lines.flatMap((line) => {
        const piece = known.get(line.productId)
        return piece && piece.remaining > 0 ? [{ piece, quantity: Math.min(line.quantity, piece.remaining) }] : []
      })
    : []
  const leftOut = known !== null && orderable.length < lines.length
  const subtotal = orderable.reduce((sum, { piece, quantity }) => sum + piece.price * quantity, 0)

  if (known && orderable.length === 0) {
    return (
      <section className="mx-auto flex max-w-110 flex-col items-center gap-6 px-gutter py-24 text-center">
        <h1 className="font-display text-display-l font-light">{t.title}</h1>
        <p className="font-display text-2xl font-light">{t.empty}</p>
        <p className="text-small text-muted-foreground">{t.emptyNote}</p>
        <Link to={to("/collection")} className={actionVariants({ variant: "outline" })}>
          {t.viewCollection}
          <MoveRight aria-hidden="true" strokeWidth={1.1} className="size-4.5 shrink-0 rtl:-scale-x-100" />
        </Link>
      </section>
    )
  }

  const address = [fields.street.trim(), fields.floor.trim()].filter(Boolean).join(", ")

  const check = (): Errors => {
    const found: Errors = {}
    if (receiver === "someoneElse") {
      if (!fields.theirName.trim()) found.theirName = t.required
      if (!fields.theirPhone.trim()) found.theirPhone = t.required
      else if (!lebanesePhone(fields.theirPhone)) found.theirPhone = m.auth.invalidPhone
    }
    if (!fields.city.trim()) found.city = t.required
    else if (fields.city.trim().length > MAX.city) found.city = interpolate(t.tooLong, { count: MAX.city })
    if (!fields.street.trim()) found.street = t.required
    else if (address.length > MAX.address) found.street = interpolate(t.tooLong, { count: MAX.address })
    return found
  }

  const place = async (e: React.FormEvent) => {
    e.preventDefault()
    const found = check()
    setErrors(found)
    setRefusal(null)
    const first = ORDER.find((key) => found[key])
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`#checkout-${first}`)?.focus()
      return
    }
    setPlacing(true)
    try {
      const order = await orders.place({
        items: orderable.map(({ piece, quantity }) => ({ productId: piece.id, quantity, unitPrice: piece.price })),
        recipient: receiver === "someoneElse" ? { name: fields.theirName.trim(), phone: lebanesePhone(fields.theirPhone)! } : null,
        city: fields.city.trim(),
        address,
        deliveryNotes: fields.notes.trim() || null,
        isGift: gift,
        giftMessage: gift ? fields.giftMessage.trim() || null : null,
      })
      clearCart()
      navigate(to(`/checkout/thanks/${order.id}`), { state: { order } })
    } catch (error) {
      setPlacing(false)
      if (!(error instanceof OrderError)) throw error
      if (error.code === "PRICE_CHANGED" || error.code === "UNAVAILABLE") showCartNotice({ kind: "server", message: error.message, productId: error.productId })
      else if (error.code === "UNAUTHORIZED") navigate(`${to("/sign-in")}?next=${encodeURIComponent(to("/checkout"))}`)
      else if (error.code === "ORDER_LIMIT") setRefusal({ message: error.message, contact: true })
      else if (error.code === "VALIDATION" || error.code === "FORBIDDEN") setRefusal({ message: error.message, contact: false })
      else setRefusal({ message: t.failed, contact: false })
    }
  }

  const text = (key: Key, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, className?: string) => (
    <Field id={`checkout-${key}`} label={label} error={errors[key]} className={className}>
      {(control) => <input type="text" value={fields[key]} onChange={set(key)} className={inputClass} {...props} {...control} />}
    </Field>
  )

  return (
    <form ref={formRef} noValidate onSubmit={place} className="px-gutter pt-[clamp(3rem,7vw,6rem)] pb-section">
      <div className="mx-auto grid max-w-content items-start gap-x-[clamp(3rem,7vw,7rem)] gap-y-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="flex min-w-0 flex-col gap-14">
          <div className="flex flex-col gap-4">
            <h1 className="font-display text-display-l leading-none font-light">{t.title}</h1>
            <p className="text-small text-muted-foreground">
              {t.signedInAs} <span className="text-foreground">{me.value.email}</span>
            </p>
          </div>

          <section className="flex flex-col gap-8">
            <SectionTitle n="01">{t.delivery}</SectionTitle>
            <div role="radiogroup" aria-label={t.receiver} className="flex flex-col gap-4">
              <p className={cn(caps, "text-muted-foreground")}>{t.receiver}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={card}>
                  <input type="radio" name="receiver" checked={receiver === "me"} onChange={() => setReceiver("me")} className={radioDot} />
                  <span className="flex flex-col gap-1.5">
                    <span className={caps}>{t.me}</span>
                    <span className="text-small">
                      {me.value.name} · {internationalPhone(me.value.phone)}
                    </span>
                  </span>
                </label>
                <label className={card}>
                  <input type="radio" name="receiver" checked={receiver === "someoneElse"} onChange={() => setReceiver("someoneElse")} className={radioDot} />
                  <span className="flex flex-col gap-1.5">
                    <span className={caps}>{t.someoneElse}</span>
                    <span className="text-small text-muted-foreground">{t.someoneElseNote}</span>
                  </span>
                </label>
              </div>
            </div>
            <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
              {receiver === "someoneElse" && (
                <>
                  {text("theirName", t.theirName, { autoComplete: "off" })}
                  <Field id="checkout-theirPhone" label={t.theirPhone} error={errors.theirPhone}>
                    {(control) => (
                      <div className="flex items-stretch gap-4">
                        <span className="flex items-center border-b border-primary/40 pt-1.5 pb-3 text-base text-muted-foreground">{m.auth.countryCode}</span>
                        <input
                          type="tel"
                          inputMode="tel"
                          autoComplete="off"
                          placeholder={m.auth.phonePlaceholder}
                          value={fields.theirPhone}
                          onChange={set("theirPhone")}
                          className={cn(inputClass, "flex-1")}
                          {...control}
                        />
                      </div>
                    )}
                  </Field>
                </>
              )}
              {text("city", t.city, { autoComplete: "address-level2", maxLength: MAX.city })}
              {text("street", t.street, { autoComplete: "address-line1" }, "sm:col-span-2")}
              {text("floor", t.floor, { autoComplete: "address-line2" })}
              <Field id="checkout-notes" label={t.notes} className="sm:col-span-2">
                {(control) => (
                  <textarea rows={3} maxLength={MAX.notes} placeholder={t.notesPlaceholder} value={fields.notes} onChange={set("notes")} className={inputClass} {...control} />
                )}
              </Field>
            </div>
          </section>

          <section className="flex flex-col gap-8 border-t border-border pt-12">
            <SectionTitle n="02">{t.gift}</SectionTitle>
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-6">
              <span>{t.isGift}</span>
              <input
                type="checkbox"
                role="switch"
                checked={gift}
                onChange={(e) => setGift(e.target.checked)}
                className="relative h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-primary/25 transition-colors duration-500 before:absolute before:start-1 before:top-1 before:size-4 before:rounded-full before:bg-background before:transition-transform before:duration-500 checked:bg-primary checked:before:translate-x-5 rtl:checked:before:-translate-x-5"
              />
            </label>
            {gift && (
              <div className="flex flex-col gap-3">
                <Field id="checkout-giftMessage" label={t.giftMessage}>
                  {(control) => (
                    <textarea
                      rows={3}
                      maxLength={MAX.giftMessage}
                      placeholder={t.giftPlaceholder}
                      value={fields.giftMessage}
                      onChange={set("giftMessage")}
                      className={cn(inputClass, "font-display text-lead italic")}
                      {...control}
                    />
                  )}
                </Field>
                <div className="flex justify-between gap-4 text-xs text-muted-foreground">
                  <span>{t.giftNote}</span>
                  <span aria-live="polite">{interpolate(t.giftCount, { count: fields.giftMessage.length, max: MAX.giftMessage })}</span>
                </div>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-8 border-t border-border pt-12">
            <SectionTitle n="03">{t.payment}</SectionTitle>
            <div role="radiogroup" aria-label={t.payment}>
              <label className={cn(card, "cursor-default border-primary bg-card")}>
                <input type="radio" name="payment" checked readOnly className={radioDot} />
                <span className="flex flex-col gap-1.5">
                  <span>{t.cod}</span>
                  <span className="text-small text-muted-foreground">{t.codNote}</span>
                </span>
              </label>
            </div>
          </section>
        </div>

        <aside aria-label={t.summary} className="flex flex-col gap-6 bg-card p-[clamp(1.5rem,3vw,2.5rem)] lg:sticky lg:top-27">
          <h2 className={caps}>{t.summary}</h2>
          {known === null ? (
            <p role="alert" className="flex flex-wrap items-center justify-between gap-3 text-small">
              {t.pricesFailed}
              <button type="button" onClick={retry} className={cn(caps, "min-h-11 text-accent")}>
                {t.retry}
              </button>
            </p>
          ) : (
            <>
              <ul className="flex flex-col">
                {orderable.map(({ piece, quantity }) => (
                  <li key={piece.id} className="grid grid-cols-[3.75rem_1fr_auto] gap-4 border-b border-border py-5 first:pt-0">
                    <div className="relative aspect-2/3 overflow-hidden bg-background">
                      {piece.images[0] ? <Picture image={piece.images[0]} alt="" sizes="60px" /> : <NoPhoto />}
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="font-display text-xl leading-tight">{noBreak(piece.name)}</span>
                      <span className="text-label uppercase tracking-caps text-muted-foreground">{stoneLabel(piece)}</span>
                      <span className="text-label uppercase tracking-caps text-muted-foreground">{interpolate(t.qty, { count: quantity })}</span>
                    </div>
                    <span className="text-sm tracking-price">{formatPrice(piece.price * quantity)}</span>
                  </li>
                ))}
              </ul>
              {leftOut && <p className="text-xs text-muted-foreground">{t.leftOut}</p>}
              <div className="flex flex-col gap-3 text-sm">
                <p className="flex justify-between">
                  <span className="text-muted-foreground">{t.subtotal}</span>
                  <span className="tracking-price">{formatPrice(subtotal)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">{t.deliveryFee}</span>
                  <span>{t.free}</span>
                </p>
                <p className="text-xs text-pretty text-muted-foreground">{t.feeNote}</p>
                <p className="flex items-baseline justify-between border-t border-border pt-3">
                  <span className={caps}>{t.total}</span>
                  <span className="text-lg tracking-price">{formatPrice(subtotal)}</span>
                </p>
              </div>
            </>
          )}
          {refusal && (
            <div role="alert" className="flex flex-col items-start gap-2 border-y border-border py-4 text-small">
              {refusal.message}
              {refusal.contact && (
                <Link to={to("/contact")} className={cn(caps, "flex min-h-11 items-center text-accent")}>
                  {t.contactOmar}
                </Link>
              )}
            </div>
          )}
          <button type="submit" disabled={placing || known === null} className={cn(actionVariants({ variant: "solid", size: "lg" }), "w-full disabled:opacity-60")}>
            {placing ? t.placing : t.place}
          </button>
          <p className="text-center text-xs text-muted-foreground">{t.fine}</p>
        </aside>
      </div>
    </form>
  )
}
