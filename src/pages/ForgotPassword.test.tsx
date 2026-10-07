import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useLocation } from "react-router"
import { createMockAuth, DEMO_CODE, DEMO_USER } from "@/features/auth/mock-auth"
import { renderAt } from "@/test/render"
import ForgotPassword from "./ForgotPassword"

function Probe() {
  const { pathname, search } = useLocation()
  return <p>landed: {pathname + search}</p>
}
const probes = [{ path: "/sign-in", Component: Probe }]

async function requestCode(email: string) {
  const user = userEvent.setup({ delay: null })
  if (email) await user.type(screen.getByLabelText("Email"), email)
  await user.click(screen.getByRole("button", { name: "Send code" }))
  return user
}

async function choose(user: ReturnType<typeof userEvent.setup>, code: string, password: string) {
  await user.click(screen.getByLabelText("Digit 1"))
  await user.keyboard(code)
  await user.type(screen.getByLabelText("New password"), password)
  await user.click(screen.getByRole("button", { name: "Save new password" }))
}

describe("ForgotPassword", () => {
  it("checks the email before sending anything", async () => {
    const auth = createMockAuth(null)
    const spy = vi.spyOn(auth, "forgotPassword")
    renderAt(<ForgotPassword />, "/forgot-password", { auth })
    await requestCode("not-an-email")
    expect(screen.getByText("Please enter a valid email address.")).toBeInTheDocument()
    expect(spy).not.toHaveBeenCalled()
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/sign-in")
  })

  it("moves on to the code step even for an unknown email, so accounts can't be discovered", async () => {
    renderAt(<ForgotPassword />, "/forgot-password", { auth: createMockAuth(null) })
    await requestCode("nobody@example.com")
    expect(await screen.findByRole("heading", { level: 1, name: "Choose a new password" })).toBeInTheDocument()
    expect(screen.getByLabelText("Digit 1")).toHaveFocus()
    expect(screen.getByText("nobody@example.com").closest("p")).toHaveTextContent(/^If an account exists for nobody@example.com, a 6-digit code/)
    expect(screen.getByRole("link", { name: "Back to sign in" })).toBeInTheDocument()
  })

  it("explains a wrong code and a weak password", async () => {
    renderAt(<ForgotPassword />, "/forgot-password", { auth: createMockAuth(null) })
    const user = await requestCode(DEMO_USER.email)
    await screen.findByLabelText("Digit 1")
    await choose(user, DEMO_CODE, "weak")
    expect(screen.getByText("Choose a password that meets all three rules below.")).toBeInTheDocument()
    await user.clear(screen.getByLabelText("New password"))
    await user.type(screen.getByLabelText("New password"), "Granite2027")
    for (let n = 6; n >= 1; n--) {
      await user.click(screen.getByLabelText(`Digit ${n}`))
      await user.keyboard("{Backspace}")
    }
    await user.click(screen.getByLabelText("Digit 1"))
    await user.keyboard("000000")
    await user.click(screen.getByRole("button", { name: "Save new password" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("That code isn't right.")
  })

  it("saves the new password and sends the customer to sign in with it", async () => {
    const auth = createMockAuth(null)
    renderAt(<ForgotPassword />, "/forgot-password", { auth, routes: probes })
    const user = await requestCode(DEMO_USER.email)
    await screen.findByLabelText("Digit 1")
    await choose(user, DEMO_CODE, "Granite2027")
    expect(await screen.findByText(`landed: /sign-in?email=${encodeURIComponent(DEMO_USER.email)}`)).toBeInTheDocument()
    expect(await auth.signIn(DEMO_USER.email, "Granite2027")).toMatchObject({ email: DEMO_USER.email })
  })

  it("lets a mistyped email be changed from the code step, keeping what was typed", async () => {
    const auth = createMockAuth(null)
    const spy = vi.spyOn(auth, "forgotPassword")
    renderAt(<ForgotPassword />, "/forgot-password", { auth })
    const user = await requestCode("nour@exmaple.com")
    await user.click(await screen.findByRole("button", { name: "Change it" }))
    expect(screen.getByRole("heading", { level: 1, name: "Reset your password" })).toBeInTheDocument()
    const email = screen.getByLabelText("Email")
    expect(email).toHaveValue("nour@exmaple.com")
    expect(email).toHaveFocus()
    await user.clear(email)
    await user.type(email, "nour@example.com")
    await user.click(screen.getByRole("button", { name: "Send code" }))
    expect(spy).toHaveBeenLastCalledWith("nour@example.com")
    expect(await screen.findByText("nour@example.com")).toBeInTheDocument()
  })

  it("starts from the email in the link", () => {
    renderAt(<ForgotPassword />, "/forgot-password?email=nour%40example.com", { auth: createMockAuth(null) })
    expect(screen.getByLabelText("Email")).toHaveValue("nour@example.com")
  })
})
