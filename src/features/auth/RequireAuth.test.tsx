import { screen } from "@testing-library/react"
import { useLocation } from "react-router"
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

  it("shows the page to a signed-in customer", async () => {
    const auth = createMockAuth(null)
    await auth.signIn(DEMO_USER.email, DEMO_USER.password)
    renderAt(page, "/account", { auth })
    expect(await screen.findByRole("heading", { name: "My account" })).toBeInTheDocument()
  })
})
