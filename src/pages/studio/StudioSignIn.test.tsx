import { act, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { STUDIO_COPY } from "@/features/studio/copy"
import { AdminAuthError } from "@/features/studio/auth/types"
import Landed from "@/test/Landed"
import { landedOn, renderStudioAt } from "@/test/render-studio"
import { fakeAdminAuth } from "@/test/studio"
import StudioSignIn from "./StudioSignIn"

const t = STUDIO_COPY.signIn
const probes = [
  { path: "/studio/products", Component: Landed },
  { path: "/studio/products/:id", Component: Landed },
  { path: "/studio/sign-in/new-password", Component: Landed },
  { path: "/studio/forgot-password", Component: Landed },
]

async function signIn(email: string, password: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(STUDIO_COPY.email), email)
  await user.type(screen.getByLabelText(STUDIO_COPY.password), password)
  await user.click(screen.getByRole("button", { name: t.submit }))
}

describe("the studio's sign-in page", () => {
  it("signs in and goes to the products list", async () => {
    renderStudioAt(<StudioSignIn />, "/studio/sign-in", { routes: probes })
    await signIn("omar@example.com", "Correct-Horse-9")
    expect(await landedOn("/studio/products")).toBeInTheDocument()
  })

  it("goes back to the studio page that asked for it", async () => {
    renderStudioAt(<StudioSignIn />, `/studio/sign-in?next=${encodeURIComponent("/studio/products/5")}`, { routes: probes })
    await signIn("omar@example.com", "Correct-Horse-9")
    expect(await landedOn("/studio/products/5")).toBeInTheDocument()
  })

  it("never follows next outside the studio", async () => {
    renderStudioAt(<StudioSignIn />, `/studio/sign-in?next=${encodeURIComponent("//evil.com/x")}`, { routes: probes })
    await signIn("omar@example.com", "Correct-Horse-9")
    expect(await landedOn("/studio/products")).toBeInTheDocument()
  })

  it("says the same thing for a wrong password and an unknown email", async () => {
    renderStudioAt(<StudioSignIn />, "/studio/sign-in", { routes: probes })
    await signIn("omar@example.com", "wrong")
    expect(await screen.findByRole("alert")).toHaveTextContent(t.wrongCredentials)
  })

  it("checks the fields before asking Cognito", async () => {
    const auth = fakeAdminAuth()
    renderStudioAt(<StudioSignIn />, "/studio/sign-in", { auth, routes: probes })
    await userEvent.setup().click(screen.getByRole("button", { name: t.submit }))
    expect(screen.getByLabelText(STUDIO_COPY.email)).toHaveAccessibleDescription(STUDIO_COPY.required)
    expect(screen.getByLabelText(STUDIO_COPY.email)).toHaveFocus()
    await signIn("not-an-email", "x")
    expect(screen.getByLabelText(STUDIO_COPY.email)).toHaveAccessibleDescription(STUDIO_COPY.invalidEmail)
    expect(auth.signIn).not.toHaveBeenCalled()
  })

  it("opens the new-password step on a first sign-in, keeping next", async () => {
    renderStudioAt(<StudioSignIn />, `/studio/sign-in?next=${encodeURIComponent("/studio/products/5")}`, {
      auth: fakeAdminAuth({ temporaryPassword: true }),
      routes: probes,
    })
    await signIn("omar@example.com", "Temporary-1")
    expect(await landedOn(`/studio/sign-in/new-password?next=${encodeURIComponent("/studio/products/5")}`)).toBeInTheDocument()
  })

  it("sends an admin whose password must be reset to the reset page", async () => {
    const auth = fakeAdminAuth()
    auth.signIn.mockRejectedValueOnce(new AdminAuthError("reset_required"))
    renderStudioAt(<StudioSignIn />, "/studio/sign-in", { auth, routes: probes })
    await signIn("omar@example.com", "Old-password-1")
    expect(await landedOn(`/studio/forgot-password?email=omar%40example.com&reset=required`)).toBeInTheDocument()
  })

  it("explains too many attempts and an unreachable service", async () => {
    const auth = fakeAdminAuth()
    auth.signIn.mockRejectedValueOnce(new AdminAuthError("too_many_attempts")).mockRejectedValueOnce(new AdminAuthError("unavailable"))
    renderStudioAt(<StudioSignIn />, "/studio/sign-in", { auth, routes: probes })
    await signIn("omar@example.com", "x")
    expect(await screen.findByRole("alert")).toHaveTextContent(STUDIO_COPY.tooManyAttempts)
    await userEvent.setup().click(screen.getByRole("button", { name: t.submit }))
    expect(await screen.findByText(STUDIO_COPY.unavailable)).toBeInTheDocument()
  })

  it("offers a reset, and no sign-up anywhere", () => {
    renderStudioAt(<StudioSignIn />, "/studio/sign-in", { routes: probes })
    expect(screen.getByRole("link", { name: t.forgot })).toHaveAttribute("href", "/studio/forgot-password")
    expect(screen.queryByText(/create an account|sign up|register/i)).not.toBeInTheDocument()
    expect(document.querySelector('a[href*="sign-up"]')).toBeNull()
  })

  it("skips the form when the admin is already signed in", async () => {
    renderStudioAt(<StudioSignIn />, "/studio/sign-in", { auth: fakeAdminAuth({ signedInAs: "omar@example.com" }), routes: probes })
    expect(await landedOn("/studio/products")).toBeInTheDocument()
  })

  it("never shows the shop's demo note or links to the shop's account pages", async () => {
    renderStudioAt(<StudioSignIn />, "/studio/sign-in", { routes: probes })
    await act(async () => {})
    expect(screen.queryByText(/demo/i)).not.toBeInTheDocument()
    expect(document.querySelector('a[href="/account"], a[href="/sign-in"]')).toBeNull()
  })
})
