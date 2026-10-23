import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useLocation } from "react-router"
import { useAuth } from "./auth-context"
import { renderAt } from "@/test/render"
import { createMockAuth, DEMO_USER } from "./mock-auth"
import RequireAuth from "./RequireAuth"

function SignInProbe() {
  const { pathname, search } = useLocation()
  return <p>sign-in page: {pathname + search}</p>
}

const page = (
  <RequireAuth>
    <h1>My account</h1>
  </RequireAuth>
)

describe("RequireAuth", () => {
  it("sends a signed-out visitor to sign in, remembering where they were going", async () => {
    renderAt(page, "/account/addresses", { auth: createMockAuth(null), routes: [{ path: "/sign-in", Component: SignInProbe }] })
    expect(await screen.findByText("sign-in page: /sign-in?next=%2Faccount%2Faddresses")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "My account" })).not.toBeInTheDocument()
  })

  it("shows nothing of the account while the saved session is read", () => {
    renderAt(page, "/account", { auth: createMockAuth(null) })
    expect(screen.queryByRole("heading", { name: "My account" })).not.toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("Checking your session…")
  })

  // The page's own Sign out decides where the customer goes; a redirect to sign-in here would beat it (it renders
  // first, while the router's navigation is still a transition).
  it("doesn't send a customer who signs out on the page to sign in", async () => {
    const auth = createMockAuth(null)
    await auth.signIn(DEMO_USER.email, DEMO_USER.password)
    function SignOutHere() {
      const { signOut } = useAuth()
      return (
        <button type="button" onClick={() => void signOut()}>
          Sign out
        </button>
      )
    }
    renderAt(
      <RequireAuth>
        <SignOutHere />
      </RequireAuth>,
      "/account",
      { auth, routes: [{ path: "/sign-in", Component: SignInProbe }] },
    )
    await userEvent.setup({ delay: null }).click(await screen.findByRole("button", { name: "Sign out" }))
    expect(await auth.currentUser()).toBeNull()
    await new Promise((done) => setTimeout(done, 50))
    expect(screen.queryByText(/sign-in page/)).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument()
  })

  it("shows the page to a signed-in customer", async () => {
    const auth = createMockAuth(null)
    await auth.signIn(DEMO_USER.email, DEMO_USER.password)
    renderAt(page, "/account", { auth })
    expect(await screen.findByRole("heading", { name: "My account" })).toBeInTheDocument()
  })
})
