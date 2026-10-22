import { act, render, screen } from "@testing-library/react"
import { useAuth } from "@/features/auth/auth-context"
import AuthProvider from "@/features/auth/AuthProvider"
import { createMockAuth, DEMO_USER } from "@/features/auth/mock-auth"
import { addToCart, CART_KEY } from "./cart"
import { useClearCartOnSignOut } from "./useClearCartOnSignOut"

function Shop() {
  useClearCartOnSignOut()
  const { signOut, status } = useAuth()
  return (
    <button type="button" onClick={() => void signOut()}>
      {status}
    </button>
  )
}

const stored = () => JSON.parse(localStorage.getItem(CART_KEY) ?? "[]")

describe("useClearCartOnSignOut", () => {
  // There is no customer sign-out button yet; whatever button comes later calls useAuth().signOut, and a shared
  // computer must not keep the last customer's cart.
  it("empties the cart when the customer signs out", async () => {
    const client = createMockAuth(null)
    await client.signIn(DEMO_USER.email, DEMO_USER.password)
    render(
      <AuthProvider client={client}>
        <Shop />
      </AuthProvider>,
    )
    await screen.findByRole("button", { name: "signedIn" })
    act(() => void addToCart(3, 2, 9))
    await act(async () => screen.getByRole("button").click())
    await screen.findByRole("button", { name: "signedOut" })
    expect(stored()).toEqual([])
  })

  it("keeps a guest's cart: loading → signed out is no sign-out", async () => {
    localStorage.setItem(CART_KEY, JSON.stringify([{ productId: 3, quantity: 1 }]))
    render(
      <AuthProvider client={createMockAuth(null)}>
        <Shop />
      </AuthProvider>,
    )
    await screen.findByRole("button", { name: "signedOut" })
    expect(stored()).toEqual([{ productId: 3, quantity: 1 }])
  })
})
