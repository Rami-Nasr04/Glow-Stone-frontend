import { useEffect, useRef } from "react"
import { useAuth } from "@/features/auth/auth-context"
import { clearCart } from "./cart"

// Signing out empties the cart (a shared computer must not keep the last customer's). The shop layout calls this, not
// the AuthProvider, so the studio's bundle never carries the cart.
export function useClearCartOnSignOut() {
  const { status } = useAuth()
  const previous = useRef(status)
  useEffect(() => {
    if (previous.current === "signedIn" && status === "signedOut") clearCart()
    previous.current = status
  }, [status])
}
