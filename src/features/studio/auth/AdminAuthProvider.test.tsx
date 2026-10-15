import { act, render, screen, waitFor } from "@testing-library/react"
import { useState } from "react"
import { createRoutesStub, useLocation } from "react-router"
import { useAuth } from "@/features/auth/auth-context"
import AuthProvider from "@/features/auth/AuthProvider"
import { createMockAuth } from "@/features/auth/mock-auth"
import { fakeAdminAuth, unauthorized } from "@/test/studio"
import { readDraft, registerOpenDraft, saveDraft } from "../drafts"
import { EMPTY_FORM } from "../product-form"
import AdminAuthProvider from "./AdminAuthProvider"
import { useAdminAuth } from "./admin-auth-context"
import RequireAdmin from "./RequireAdmin"

function Probe() {
  const { pathname, search } = useLocation()
  return <p>landed: {pathname + search}</p>
}

function AdminStatus() {
  const { status, email } = useAdminAuth()
  return <p>admin: {status} {email}</p>
}

function renderStudio(client: ReturnType<typeof fakeAdminAuth>, path: string, page: React.ReactNode = <p>the page</p>) {
  const Stub = createRoutesStub([
    { path: "/studio/sign-in", Component: Probe },
    {
      path: "/studio/products/:id",
      Component: () => (
        <RequireAdmin>
          {page}
        </RequireAdmin>
      ),
    },
  ])
  return render(
    <AdminAuthProvider client={client} apiBase="https://api.test">
      <Stub initialEntries={[path]} />
    </AdminAuthProvider>,
  )
}

beforeEach(() => sessionStorage.clear())

describe("the studio session", () => {
  it("shows a studio page to a signed-in admin", async () => {
    renderStudio(fakeAdminAuth({ signedInAs: "omar@example.com" }), "/studio/products/5")
    expect(await screen.findByText("the page")).toBeInTheDocument()
  })

  it("waits for the saved session before deciding", () => {
    const client = fakeAdminAuth({ signedInAs: "omar@example.com" })
    client.currentAdmin.mockReturnValueOnce(new Promise(() => {}))
    renderStudio(client, "/studio/products/5")
    expect(screen.getByRole("status")).toHaveTextContent("Checking your session")
    expect(screen.queryByText("the page")).not.toBeInTheDocument()
  })

  it("sends a signed-out visitor to sign in, and back to the same page after", async () => {
    renderStudio(fakeAdminAuth(), "/studio/products/5?x=1")
    expect(await screen.findByText(`landed: /studio/sign-in?next=${encodeURIComponent("/studio/products/5?x=1")}`)).toBeInTheDocument()
  })

  it("never lets a customer's session into the studio", async () => {
    const customers = createMockAuth(null)
    await customers.signUp({ name: "Rana", email: "rana@example.com", phone: "+96171234567", password: "Customer-1" })
    await customers.confirmSignUp("rana@example.com", "123456")
    await customers.signIn("rana@example.com", "Customer-1")
    const Stub = createRoutesStub([
      { path: "/studio/sign-in", Component: Probe },
      { path: "/studio/products", Component: () => <RequireAdmin>the page</RequireAdmin> },
    ])
    render(
      <AuthProvider client={customers}>
        <AdminAuthProvider client={fakeAdminAuth()} apiBase="https://api.test">
          <Stub initialEntries={["/studio/products"]} />
        </AdminAuthProvider>
      </AuthProvider>,
    )
    expect(await screen.findByText(/landed: \/studio\/sign-in/)).toBeInTheDocument()
  })

  it("never shows the studio's session on the shop", async () => {
    function Shop() {
      return <p>customer: {useAuth().status}</p>
    }
    render(
      <AuthProvider client={createMockAuth(null)}>
        <AdminAuthProvider client={fakeAdminAuth({ signedInAs: "omar@example.com" })} apiBase="https://api.test">
          <AdminStatus />
          <Shop />
        </AdminAuthProvider>
      </AuthProvider>,
    )
    expect(await screen.findByText("admin: signedIn omar@example.com")).toBeInTheDocument()
    expect(screen.getByText("customer: signedOut")).toBeInTheDocument()
  })

  it("ends the session on any 401, keeps the open form's draft, and goes to sign in with next", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => unauthorized()))
    const client = fakeAdminAuth({ signedInAs: "omar@example.com" })
    const unregister = registerOpenDraft(() => ({ key: 5, values: { ...EMPTY_FORM, name: "Unsaved name" } }))
    function CallsApi() {
      const { api } = useAdminAuth()
      return (
        <button type="button" onClick={() => api.listProducts().catch(() => undefined)}>
          load
        </button>
      )
    }
    renderStudio(client, "/studio/products/5", <CallsApi />)
    const load = await screen.findByRole("button", { name: "load" })
    await act(async () => load.click())
    expect(await screen.findByText(`landed: /studio/sign-in?next=${encodeURIComponent("/studio/products/5")}`)).toBeInTheDocument()
    expect(client.clearSession).toHaveBeenCalled()
    expect(client.signOut).not.toHaveBeenCalled()
    expect(readDraft(5)?.name).toBe("Unsaved name")
    unregister()
  })

  it("signs out: clears the session and every kept draft", async () => {
    const client = fakeAdminAuth({ signedInAs: "omar@example.com" })
    saveDraft(5, { ...EMPTY_FORM, name: "Kept" })
    function SignOut() {
      const { signOut } = useAdminAuth()
      return (
        <button type="button" onClick={() => void signOut()}>
          sign out
        </button>
      )
    }
    render(
      <AdminAuthProvider client={client} apiBase="https://api.test">
        <AdminStatus />
        <SignOut />
      </AdminAuthProvider>,
    )
    await screen.findByText("admin: signedIn omar@example.com")
    await act(async () => screen.getByRole("button", { name: "sign out" }).click())
    await waitFor(() => expect(screen.getByText(/admin: signedOut/)).toBeInTheDocument())
    expect(client.signOut).toHaveBeenCalled()
    expect(readDraft(5)).toBeNull()
  })

  it("signs in, and asks for a new password when Cognito does", async () => {
    const client = fakeAdminAuth({ temporaryPassword: true })
    function FirstSignIn() {
      const { signIn, completeNewPassword } = useAdminAuth()
      const [step, setStep] = useState("")
      return (
        <>
          <AdminStatus />
          <p>step: {step}</p>
          <button type="button" onClick={() => void signIn("omar@example.com", "Temporary-1").then((result) => setStep(result.status))}>
            sign in
          </button>
          <button type="button" onClick={() => void completeNewPassword("A-New-Password-1")}>
            choose
          </button>
        </>
      )
    }
    render(
      <AdminAuthProvider client={client} apiBase="https://api.test">
        <FirstSignIn />
      </AdminAuthProvider>,
    )
    await screen.findByText(/admin: signedOut/)
    await act(async () => screen.getByRole("button", { name: "sign in" }).click())
    expect(await screen.findByText("step: newPasswordRequired")).toBeInTheDocument()
    expect(screen.getByText(/admin: signedOut/)).toBeInTheDocument()
    await act(async () => screen.getByRole("button", { name: "choose" }).click())
    expect(await screen.findByText("admin: signedIn omar@example.com")).toBeInTheDocument()
  })
})
