import { act, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useLocation } from "react-router"
import { createMockAuth, DEMO_CODE } from "@/features/auth/mock-auth"
import { rememberPendingPassword } from "@/features/auth/pending-password"
import { AuthError } from "@/features/auth/types"
import { renderAt } from "@/test/render"
import Verify from "./Verify"

function Probe() {
  const { pathname, search } = useLocation()
  return <p>landed: {pathname + search}</p>
}
const probes = ["/", "/sign-up", "/sign-in", "/checkout"].map((path) => ({ path, Component: Probe }))

const newcomer = { name: "Rana Khoury", email: "rana@example.com", phone: "+96171000000", password: "Cedar2026" }

async function newAccount() {
  const auth = createMockAuth(null)
  await auth.signUp(newcomer)
  return auth
}

async function enter(code: string) {
  const user = userEvent.setup()
  await user.click(screen.getByLabelText("Digit 1"))
  await user.keyboard(code)
  await user.click(screen.getByRole("button", { name: "Verify" }))
}

describe("Verify", () => {
  afterEach(() => vi.useRealTimers())

  it("needs to know which email to verify", async () => {
    renderAt(<Verify />, "/verify", { auth: createMockAuth(null), routes: probes })
    expect(await screen.findByText("landed: /sign-up")).toBeInTheDocument()
  })

  it("names the email and waits for all six digits", async () => {
    renderAt(<Verify />, "/verify?email=rana%40example.com", { auth: await newAccount() })
    expect(screen.getByRole("heading", { level: 1, name: "Check your email" })).toBeInTheDocument()
    expect(screen.getByText("rana@example.com")).toBeInTheDocument()
    expect(screen.getByLabelText("Digit 1")).toHaveFocus()
    const button = screen.getByRole("button", { name: "Verify" })
    expect(button).toBeDisabled()
    const user = userEvent.setup()
    await user.click(screen.getByLabelText("Digit 1"))
    await user.keyboard("12345")
    expect(button).toBeDisabled()
    await user.keyboard("6")
    expect(button).toBeEnabled()
  })

  it("explains a wrong code", async () => {
    renderAt(<Verify />, "/verify?email=rana%40example.com", { auth: await newAccount() })
    await enter("000000")
    expect(await screen.findByRole("alert")).toHaveTextContent("That code isn't right.")
    expect(screen.getByLabelText("Digit 1")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByLabelText("Digit 1")).toHaveFocus()
  })

  it("explains an expired code and points to a new one", async () => {
    const auth = await newAccount()
    vi.spyOn(auth, "confirmSignUp").mockRejectedValueOnce(new AuthError("expired_code"))
    renderAt(<Verify />, "/verify?email=rana%40example.com", { auth })
    await enter("123456")
    expect(await screen.findByRole("alert")).toHaveTextContent("This code has expired. Please ask for a new one.")
  })

  it("says when the connection failed", async () => {
    const auth = await newAccount()
    vi.spyOn(auth, "confirmSignUp").mockRejectedValueOnce(new AuthError("network"))
    renderAt(<Verify />, "/verify?email=rana%40example.com", { auth })
    await enter("123456")
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't reach Glowstone.")
  })

  it("signs a brand-new customer straight in and continues to where they were going", async () => {
    const auth = await newAccount()
    rememberPendingPassword(newcomer.email, newcomer.password)
    renderAt(<Verify />, "/verify?email=rana%40example.com&next=%2Fcheckout", { auth, routes: probes })
    await enter(DEMO_CODE)
    expect(await screen.findByText("landed: /checkout")).toBeInTheDocument()
    expect(await auth.currentUser()).toMatchObject({ email: "rana@example.com" })
  })

  it("goes home after signing a new customer in when no destination was given", async () => {
    const auth = await newAccount()
    rememberPendingPassword(newcomer.email, newcomer.password)
    renderAt(<Verify />, "/verify?email=rana%40example.com", { auth, routes: probes })
    await enter(DEMO_CODE)
    expect(await screen.findByText("landed: /")).toBeInTheDocument()
  })

  it("asks to sign in when the page was reloaded after creating the account", async () => {
    renderAt(<Verify />, "/verify?email=rana%40example.com", { auth: await newAccount(), routes: probes })
    await enter(DEMO_CODE)
    expect(await screen.findByText("landed: /sign-in?email=rana%40example.com")).toBeInTheDocument()
  })

  it("lets a new code be sent after 30 seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const auth = await newAccount()
    const resend = vi.spyOn(auth, "resendCode")
    renderAt(<Verify />, "/verify?email=rana%40example.com", { auth })
    expect(screen.getByRole("button", { name: "Resend code in 0:30" })).toBeDisabled()
    await act(() => vi.advanceTimersByTimeAsync(30_000))
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    await user.click(screen.getByRole("button", { name: "Resend code" }))
    expect(resend).toHaveBeenCalledWith("rana@example.com")
    expect(await screen.findByRole("button", { name: /Resend code in 0:(30|29)/ })).toBeDisabled()
  })
})
