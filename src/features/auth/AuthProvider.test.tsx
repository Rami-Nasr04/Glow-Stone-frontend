import { act, render, screen } from "@testing-library/react"
import { addToCart, CART_KEY } from "@/features/cart/cart"
import { useAuth } from "./auth-context"
import AuthProvider from "./AuthProvider"
import { createMockAuth, DEMO_USER } from "./mock-auth"

function SignOutProbe() {
  const { signOut, status } = useAuth()
  return (
    <button type="button" onClick={() => void signOut()}>
      {status}
    </button>
  )
}

describe("AuthProvider", () => {
  // There is no customer sign-out button yet; whatever button comes later calls this signOut, and a shared computer
  // must not keep the last customer's cart.
  it("empties the cart when the customer signs out", async () => {
    const client = createMockAuth(null)
    await client.signIn(DEMO_USER.email, DEMO_USER.password)
    render(
      <AuthProvider client={client}>
        <SignOutProbe />
      </AuthProvider>,
    )
    await screen.findByRole("button", { name: "signedIn" })
    act(() => void addToCart(3, 2, 9))
    await act(async () => screen.getByRole("button").click())
    await screen.findByRole("button", { name: "signedOut" })
    expect(JSON.parse(localStorage.getItem(CART_KEY)!)).toEqual([])
  })
})
