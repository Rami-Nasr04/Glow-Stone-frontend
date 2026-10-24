import { useEffect, useState } from "react"
import { useOrders } from "./client"
import { type Order, OrderError } from "./types"

/** Why the customer's data isn't there: no answer (try again), signed out on the server (401), or refused (403). */
export type Failure = { status: "failed" } | { status: "signIn" } | { status: "refused"; message: string }

export type Loaded<T> = { status: "loading" } | { status: "ready"; value: T } | { status: "missing" } | Failure

export type NotReady = Exclude<Loaded<unknown>, { status: "ready" }>

export function failureOf(error: unknown): Failure {
  if (error instanceof OrderError && error.code === "UNAUTHORIZED") return { status: "signIn" }
  if (error instanceof OrderError && error.code === "FORBIDDEN") return { status: "refused", message: error.message }
  return { status: "failed" }
}

/** One of the customer's orders (GET /me/orders/{id}); `initial` is the order checkout just placed. */
export function useOrder(id: number, initial?: Order): [Loaded<Order>, (order: Order) => void, () => void] {
  const orders = useOrders()
  const [state, setState] = useState<Loaded<Order>>(initial?.id === id ? { status: "ready", value: initial } : { status: "loading" })
  const [attempt, setAttempt] = useState(0)
  const ready = state.status === "ready"
  useEffect(() => {
    if (ready) return
    let live = true
    orders.get(id).then(
      (order) => live && setState(order ? { status: "ready", value: order } : { status: "missing" }),
      (error: unknown) => live && setState(failureOf(error)),
    )
    return () => {
      live = false
    }
  }, [orders, id, attempt, ready])
  const retry = () => {
    setState({ status: "loading" })
    setAttempt((n) => n + 1)
  }
  return [state, (order) => setState({ status: "ready", value: order }), retry]
}
