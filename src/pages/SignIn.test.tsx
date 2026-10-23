import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useLocation } from "react-router"
import { createMockAuth, DEMO_USER } from "@/features/auth/mock-auth"
import { takePendingPassword } from "@/features/auth/pending-password"
import { AuthError } from "@/features/auth/types"
import { renderAt } from "@/test/render"
import SignIn from "./SignIn"

function Probe() {
  const { pathname, search } = useLocation()
  return <p>landed: {pathname + search}</p>
}
const probes = ["/", "/account", "/checkout", "/verify"].map((path) => ({ path, Component: Probe }))

async function signIn(email: string, password: string) {
  const user = userEvent.setup({ delay: null })
  await user.type(screen.getByLabelText("Email"), email)
  await user.type(screen.getByLabelText("Password"), password)
  await user.click(screen.getByRole("button", { name: "Sign in" }))
}

describe("SignIn", () => {
  it("has one h1 and links to the other flows, keeping the destination", () => {
    renderAt(<SignIn />, "/sign-in?next=%2Fcheckout", { auth: createMockAuth(null) })
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/sign-up?next=%2Fcheckout")
    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", "/forgot-password")
    expect(screen.getByRole("link", { name: "Glowstone home" }).className).toContain("min-h-11")
  })

  it("draws the wordmark from the vector file, large enough that 'Made in Lebanon' stays sharp", () => {
    renderAt(<SignIn />, "/sign-in", { auth: createMockAuth(null) })
    const home = screen.getByRole("link", { name: "Glowstone home" })
    expect(home.querySelector("img")).toHaveAttribute("src", "/brand/glowstone-wordmark.svg")
    // 420px on desktop keeps the tagline about 8px tall (5px at the prototype's 260px blurred on 1x screens).
    expect(home.className).toContain("lg:w-105")
    expect(home.className).toContain("w-[min(340px,86vw)]")
  })

  it("explains an empty form without sending it", async () => {
    const auth = createMockAuth(null)
    const spy = vi.spyOn(auth, "signIn")
    renderAt(<SignIn />, "/sign-in", { auth })
    await userEvent.setup({ delay: null }).click(screen.getByRole("button", { name: "Sign in" }))
    expect(screen.getAllByText("Please fill this in.")).toHaveLength(2)
    expect(screen.getByLabelText("Email")).toHaveFocus()
    expect(spy).not.toHaveBeenCalled()
  })

  it("says plainly when the password is wrong", async () => {
    renderAt(<SignIn />, "/sign-in", { auth: createMockAuth(null) })
    await signIn(DEMO_USER.email, "Wrong2026")
    expect(await screen.findByRole("alert")).toHaveTextContent("That password doesn't match this email.")
    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true")
  })

  it("goes to a safe ?next= destination after signing in", async () => {
    renderAt(<SignIn />, "/sign-in?next=%2Fcheckout", { auth: createMockAuth(null), routes: probes })
    await signIn(DEMO_USER.email, DEMO_USER.password)
    expect(await screen.findByText("landed: /checkout")).toBeInTheDocument()
  })

  it("ignores a ?next= that leaves the site and goes home (the account page comes later)", async () => {
    renderAt(<SignIn />, "/sign-in?next=%2F%2Fevil.com", { auth: createMockAuth(null), routes: probes })
    await signIn(DEMO_USER.email, DEMO_USER.password)
    expect(await screen.findByText("landed: /")).toBeInTheDocument()
  })

  it("sends an unverified account to the verify step with a fresh code", async () => {
    const auth = createMockAuth(null)
    await auth.signUp({ name: "Rana Khoury", email: "rana@example.com", phone: "+96171000000", password: "Cedar2026" })
    const resend = vi.spyOn(auth, "resendCode")
    renderAt(<SignIn />, "/sign-in", { auth, routes: probes })
    await signIn("rana@example.com", "Cedar2026")
    expect(await screen.findByText("landed: /verify?email=rana%40example.com")).toBeInTheDocument()
    expect(resend).toHaveBeenCalledWith("rana@example.com")
    // Verifying then signs them straight in: the password waits in memory.
    expect(takePendingPassword("rana@example.com")).toBe("Cedar2026")
  })

  it("says when the connection failed", async () => {
    const auth = createMockAuth(null)
    vi.spyOn(auth, "signIn").mockRejectedValueOnce(new AuthError("network"))
    renderAt(<SignIn />, "/sign-in", { auth })
    await signIn(DEMO_USER.email, DEMO_USER.password)
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't reach Glowstone. Check your connection and try again.")
  })

  it("pre-fills the email from the link and shows the demo note", () => {
    renderAt(<SignIn />, "/sign-in?email=nour%40example.com", { auth: createMockAuth(null) })
    expect(screen.getByLabelText("Email")).toHaveValue("nour@example.com")
    expect(screen.getByText(/Every emailed code is 123456/)).toBeInTheDocument()
  })
})
