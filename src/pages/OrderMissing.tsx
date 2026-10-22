import { actionVariants } from "@/components/ui/action-link"
import { useLocale } from "@/i18n/useLocale"

interface OrderMissingProps {
  state: "loading" | "missing" | "failed"
  retry: () => void
}

// What an order page shows until the order is there: loading, not this customer's, or no answer.
export default function OrderMissing({ state, retry }: OrderMissingProps) {
  const { m } = useLocale()
  if (state === "loading") {
    return (
      <p role="status" className="px-gutter py-24 text-center text-muted-foreground">
        {m.orders.loading}
      </p>
    )
  }
  return (
    <section className="mx-auto flex max-w-110 flex-col items-center gap-6 px-gutter py-24 text-center">
      <p role="alert">{state === "missing" ? m.orders.notFound : m.orders.loadFailed}</p>
      {state === "failed" && (
        <button type="button" onClick={retry} className={actionVariants({ variant: "outline" })}>
          {m.orders.retry}
        </button>
      )}
    </section>
  )
}
