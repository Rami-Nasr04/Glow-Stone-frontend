import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useLocation } from "react-router"
import { createMockAuth, DEMO_USER } from "@/features/auth/mock-auth"
import { takePendingPassword } from "@/features/auth/pending-password"
import { renderAt } from "@/test/render"
import SignUp from "./SignUp"

function Probe() {
  const { pathname, search, state } = useLocation()
  return (
    <p>
      landed: {pathname + search} {state?.password ? "with password" : "without password"}
    </p>
  )
}
const probes = [{ path: "/verify", Component: Probe }]

async function fill(fields: Partial<Record<"name" | "email" | "phone" | "password", string>>) {
  const user = userEvent.setup({ delay: null })
  if (fields.name) await user.type(screen.getByLabelText("Full name"), fields.name)
  if (fields.email) await user.type(screen.getByLabelText("Email"), fields.email)
  if (fields.phone) await user.type(screen.getByLabelText("Phone"), fields.phone)
  if (fields.password) await user.type(screen.getByLabelText("Password"), fields.password)
  await user.click(screen.getByRole("button", { name: "Create account" }))
}

const valid = { name: "Rana Khoury", email: "rana@example.com", phone: "71 000 000", password: "Cedar2026" }

describe("SignUp", () => {
  it("has one h1 and links back to sign in, keeping the destination", () => {
    renderAt(<SignUp />, "/sign-up?next=%2Fcheckout", { auth: createMockAuth(null) })
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in?next=%2Fcheckout")
    expect(screen.getByText("+961")).toBeInTheDocument()
  })

  it("ticks the password rules as they are met, for eyes and screen readers", async () => {
    renderAt(<SignUp />, "/sign-up", { auth: createMockAuth(null) })
    const rules = screen.getByRole("list")
    expect(within(rules).getAllByText("(not yet met)")).toHaveLength(3)
    await userEvent.setup({ delay: null }).type(screen.getByLabelText("Password"), "Stone")
    expect(within(rules).getByText("An uppercase letter").closest("li")).toHaveTextContent("(met)")
    expect(within(rules).getByText("A number").closest("li")).toHaveTextContent("(not yet met)")
  })

  it("blocks a bad phone and a weak password, focusing the first problem", async () => {
    const auth = createMockAuth(null)
    const spy = vi.spyOn(auth, "signUp")
    renderAt(<SignUp />, "/sign-up", { auth })
    await fill({ ...valid, phone: "1234", password: "stone" })
    expect(screen.getByText("Please enter a Lebanese number, like 71 234 567.")).toBeInTheDocument()
    expect(screen.getByText("Choose a password that meets all three rules below.")).toBeInTheDocument()
    expect(screen.getByLabelText("Phone")).toHaveFocus()
    expect(spy).not.toHaveBeenCalled()
  })

  it("creates the account and hands the password to the verify step in memory, never in history", async () => {
    const auth = createMockAuth(null)
    const spy = vi.spyOn(auth, "signUp")
    renderAt(<SignUp />, "/sign-up?next=%2Fcheckout", { auth, routes: probes })
    await fill(valid)
    expect(spy).toHaveBeenCalledWith({ name: "Rana Khoury", email: "rana@example.com", phone: "+96171000000", password: "Cedar2026" })
    expect(await screen.findByText("landed: /verify?email=rana%40example.com&next=%2Fcheckout without password")).toBeInTheDocument()
    expect(takePendingPassword("rana@example.com")).toBe("Cedar2026")
    expect(takePendingPassword("rana@example.com")).toBeNull()
  })

  it("offers to sign in when the email already has an account", async () => {
    renderAt(<SignUp />, "/sign-up", { auth: createMockAuth(null) })
    await fill({ ...valid, email: DEMO_USER.email })
    expect(await screen.findByRole("alert")).toHaveTextContent("An account already exists for this email.")
    expect(screen.getByRole("link", { name: "Sign in instead" })).toHaveAttribute("href", `/sign-in?email=${encodeURIComponent(DEMO_USER.email)}`)
  })
})
