import { useEffect, useState } from "react"
import { useOrders } from "./client"
import type { Order } from "./types"

export type Loaded<T> = { status: "loading" } | { status: "ready"; value: T } | { status: "missing" } | { status: "failed" }

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
      () => live && setState({ status: "failed" }),
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
