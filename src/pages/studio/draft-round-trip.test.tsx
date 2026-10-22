import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { createRoutesStub, Outlet } from "react-router"
import AdminAuthProvider from "@/features/studio/auth/AdminAuthProvider"
import RequireAdmin from "@/features/studio/auth/RequireAdmin"
import { STUDIO_COPY } from "@/features/studio/copy"
import { readDraft } from "@/features/studio/drafts"
import { adminProductOf, bodiesOf, fakeAdminAuth, setupUser, stubAdminApi, unauthorized } from "@/test/studio"
import StudioProductEdit from "./StudioProductEdit"
import StudioProductNew from "./StudioProductNew"
import StudioSignIn from "./StudioSignIn"
import StudioSignOut from "./StudioSignOut"

// These tests drive the studio's full product editor (and, in some, the sign-in round trip). Profiled 2026-10-24: one
// takes ~1.5 s of pure CPU (React's development rendering of the whole form on every key, and jsdom computing accessible
// names for the role queries); with the suite's 8 workers on a busy PC that passed 5 s. So these files get 15 s.
vi.setConfig({ testTimeout: 15_000 })

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const f = STUDIO_COPY.form
const field = (label: string) => screen.getByLabelText(new RegExp(`^${label.replace(/[()]/g, "\\$&")}`))
const PASSWORD = "Correct-Horse-9"

// The studio as it is routed: sign-in pages outside the guard, product pages inside it.
function renderStudio(path: string, auth = fakeAdminAuth({ signedInAs: "omar@example.com" })) {
  const Stub = createRoutesStub([
    { path: "/studio/sign-in", Component: StudioSignIn },
    { path: "/studio/sign-out", Component: StudioSignOut },
    {
      Component: () => (
        <RequireAdmin>
          <Outlet />
        </RequireAdmin>
      ),
      children: [
        { path: "/studio/products/new", Component: StudioProductNew },
        { path: "/studio/products/:id", Component: StudioProductEdit },
        { path: "/studio/products", Component: () => <p>the list</p> },
      ],
    },
  ])
  render(
    <AdminAuthProvider client={auth} apiBase="https://api.test">
      <Stub initialEntries={[path]} />
    </AdminAuthProvider>,
  )
  return auth
}

// Pasted, as a password manager fills them: typing each key is covered by the sign-in page's own tests.
async function signInAgain() {
  const user = setupUser()
  expect(await screen.findByText(STUDIO_COPY.signIn.sessionEnded)).toBeInTheDocument()
  await user.click(screen.getByLabelText(STUDIO_COPY.email))
  await user.paste("omar@example.com")
  await user.click(screen.getByLabelText(STUDIO_COPY.password))
  await user.paste(PASSWORD)
  await user.click(screen.getByRole("button", { name: STUDIO_COPY.signIn.submit }))
}

function storedText(): string {
  return Object.keys(sessionStorage)
    .map((key) => `${key}=${sessionStorage.getItem(key)}`)
    .join("\n")
}

beforeEach(() => sessionStorage.clear())

// Rami, 2026-10-16: a 401 never loses the admin's work.
describe("unsaved changes across a 401", () => {
  it("keeps an edit through sign-in, restores it with a notice, and clears it on save", async () => {
    let expired = true
    const fetch = stubAdminApi([adminProductOf(1)], (method) => (method === "PATCH" && expired ? unauthorized() : undefined))
    renderStudio("/studio/products/1")
    const user = setupUser()
    await screen.findByRole("heading", { level: 1, name: "Arz" })
    await user.clear(field(f.fields.price))
    await user.type(field(f.fields.price), "455")
    await user.type(field(f.fields.color), " light")
    await user.click(screen.getByRole("button", { name: f.save }))

    // The session ended: the draft is kept under the piece's id, with no token or password.
    await screen.findByRole("heading", { level: 1, name: STUDIO_COPY.signIn.title })
    expect(readDraft(1)).toMatchObject({ price: "455", color: "Warm beige light" })
    expect(storedText()).not.toMatch(/access-1|Bearer|eyJ|Correct-Horse/)

    expired = false
    await signInAgain()
    await screen.findByRole("heading", { level: 1, name: "Arz" })
    expect(screen.getByText(f.restored).closest('[role="status"]')).not.toBeNull()
    expect(field(f.fields.price)).toHaveValue("455")
    expect(field(f.fields.color)).toHaveValue("Warm beige light")
    expect(screen.getByText(f.unsaved)).toBeInTheDocument()
    expect(storedText()).not.toMatch(/Correct-Horse/)

    await user.click(screen.getByRole("button", { name: f.save }))
    await waitFor(() => expect(bodiesOf(fetch, "PATCH").at(-1)).toEqual({ price: 455, color: "Warm beige light" }))
    await waitFor(() => expect(readDraft(1)).toBeNull())
  })

  it("keeps a new piece under \"new\" and restores it on the new-product page", async () => {
    let expired = true
    stubAdminApi([], (method) => (method === "POST" && expired ? unauthorized() : undefined))
    renderStudio("/studio/products/new")
    const user = setupUser()
    await screen.findByRole("heading", { level: 1, name: f.newTitle })
    await user.type(field(f.fields.name), "Half-made piece")
    await user.click(screen.getByRole("button", { name: f.create }))
    // The form's own checks stop it first; the token runs out on the next real call.
    await user.type(field(f.fields.stoneType), "Limestone")
    await user.type(field(f.fields.color), "Cream")
    await user.type(field(f.fields.price), "300")
    await user.type(field(f.fields.bottles), "4")
    await user.type(field(f.fields.editionSize), "6")
    await user.type(field(f.fields.remaining), "6")
    await user.click(screen.getByRole("button", { name: f.create }))

    await screen.findByRole("heading", { level: 1, name: STUDIO_COPY.signIn.title })
    expect(readDraft("new")).toMatchObject({ name: "Half-made piece", price: "300" })
    expired = false
    await signInAgain()
    await screen.findByRole("heading", { level: 1, name: f.newTitle })
    expect(screen.getByText(f.restored)).toBeInTheDocument()
    expect(field(f.fields.name)).toHaveValue("Half-made piece")
  })

  it("throws the kept drafts away when the admin signs out", async () => {
    stubAdminApi([adminProductOf(1)], (method) => (method === "PATCH" ? unauthorized() : undefined))
    renderStudio("/studio/products/1")
    const user = setupUser()
    await screen.findByRole("heading", { level: 1, name: "Arz" })
    await user.type(field(f.fields.color), " light")
    await user.click(screen.getByRole("button", { name: f.save }))
    await screen.findByRole("heading", { level: 1, name: STUDIO_COPY.signIn.title })
    expect(readDraft(1)).not.toBeNull()
    // Later, in the same tab, the admin signs out instead of carrying on.
    cleanup()
    renderStudio("/studio/sign-out")
    await screen.findByRole("heading", { level: 1, name: STUDIO_COPY.signIn.title })
    expect(readDraft(1)).toBeNull()
  })
})
