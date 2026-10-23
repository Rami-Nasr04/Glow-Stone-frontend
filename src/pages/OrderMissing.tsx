import { Navigate, useLocation, useNavigate } from "react-router"
import { actionVariants } from "@/components/ui/action-link"
import { useAuth } from "@/features/auth/auth-context"
import type { NotReady } from "@/features/orders/use-order"
import { useLocale } from "@/i18n/useLocale"

interface OrderMissingProps {
  state: NotReady
  /** For "failed": ask again. */
  retry?: () => void
}

// What a customer page shows until its data is there: loading, not this customer's, no answer, the session refused
// by the API (sign in again and come back here), or the account refused (the API's words, and a way to sign out).
export default function OrderMissing({ state, retry }: OrderMissingProps) {
  const { m, to } = useLocale()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const signInHere = `${to("/sign-in")}?next=${encodeURIComponent(pathname + search)}`

  if (state.status === "signIn") return <Navigate replace to={signInHere} />
  if (state.status === "refused") {
    return (
      <section className="mx-auto flex max-w-110 flex-col items-center gap-6 px-gutter py-24 text-center">
        <p role="alert">{state.message}</p>
        <button
          type="button"
          onClick={async () => {
            await signOut()
            navigate(signInHere)
          }}
          className={actionVariants({ variant: "outline" })}
        >
          {m.orders.signOut}
        </button>
      </section>
    )
  }
  if (state.status === "loading") {
    return (
      <p role="status" className="px-gutter py-24 text-center text-muted-foreground">
        {m.orders.loading}
      </p>
    )
  }
  return (
    <section className="mx-auto flex max-w-110 flex-col items-center gap-6 px-gutter py-24 text-center">
      <p role="alert">{state.status === "missing" ? m.orders.notFound : m.orders.loadFailed}</p>
      {state.status === "failed" && retry && (
        <button type="button" onClick={retry} className={actionVariants({ variant: "outline" })}>
          {m.orders.retry}
        </button>
      )}
    </section>
  )
}
