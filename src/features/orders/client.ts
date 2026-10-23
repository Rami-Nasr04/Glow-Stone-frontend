import { useMemo } from "react"
import { useAuth } from "@/features/auth/auth-context"
import type { AuthClient } from "@/features/auth/types"
import { apiBase, listProducts } from "@/features/catalog/catalog"
import { createHttpOrders } from "./api"
import { createDemoFetch } from "./demo-api"
import type { OrdersClient } from "./types"

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage
  } catch {
    return null
  }
}

// The real routes with the real customer pool; the demo accounts talk to the demo API in this browser.
export function ordersFor(auth: AuthClient): OrdersClient {
  const token = () => auth.accessToken()
  if (auth.mode === "live") return createHttpOrders(apiBase(), token)
  return createHttpOrders("https://demo.glowstone.invalid", token, createDemoFetch({ storage: browserStorage(), products: () => listProducts() }))
}

export function useOrders(): OrdersClient {
  const { client } = useAuth()
  return useMemo(() => ordersFor(client), [client])
}
