import { screen } from "@testing-library/react"
import { AdminAuthError } from "@/features/studio/auth/types"
import { STUDIO_COPY } from "@/features/studio/copy"
import Landed from "@/test/Landed"
import { landedOn, renderStudioAt } from "@/test/render-studio"
import { fakeAdminAuth, setupUser } from "@/test/studio"
import StudioNewPassword from "./StudioNewPassword"

const t = STUDIO_COPY.newPassword
const probes = [
  { path: "/studio/orders", Component: Landed },
  { path: "/studio/products", Component: Landed },
  { path: "/studio/products/:id", Component: Landed },
]

async function choose(password: string, repeat = password) {
  const user = setupUser()
  await user.type(screen.getByLabelText(t.password), password)
  await user.type(screen.getByLabelText(t.repeat), repeat)
  await user.click(screen.getByRole("button", { name: t.submit }))
}

async function afterTemporarySignIn() {
  const auth = fakeAdminAuth({ temporaryPassword: true })
  await auth.signIn("omar@example.com", "Temporary-1")
  return auth
}

describe("the studio's choose-your-password page", () => {
  it("lists the policy and ticks each rule as it is met", async () => {
    renderStudioAt(<StudioNewPassword />, "/studio/sign-in/new-password", { auth: await afterTemporarySignIn() })
    await setupUser().type(screen.getByLabelText(t.password), "limestone")
    expect(screen.getByText(STUDIO_COPY.rules.length).parentElement).toHaveTextContent("(not yet met)")
    expect(screen.getByText(STUDIO_COPY.rules.lowercase).parentElement).toHaveTextContent("(met)")
  })

  it("checks the policy and the repeat before sending anything", async () => {
    const auth = await afterTemporarySignIn()
    renderStudioAt(<StudioNewPassword />, "/studio/sign-in/new-password", { auth })
    await choose("short")
    expect(screen.getByLabelText(t.password)).toHaveAccessibleDescription(expect.stringContaining(t.weak))
    expect(screen.getByLabelText(t.password)).toHaveFocus()
    await setupUser().clear(screen.getByLabelText(t.password))
    await setupUser().clear(screen.getByLabelText(t.repeat))
    await choose("Limestone-2026", "Limestone-2025")
    expect(screen.getByLabelText(t.repeat)).toHaveAccessibleDescription(t.mismatch)
    expect(auth.completeNewPassword).not.toHaveBeenCalled()
  })

  it("saves the password, signs in and goes on to next", async () => {
    renderStudioAt(<StudioNewPassword />, `/studio/sign-in/new-password?next=${encodeURIComponent("/studio/products/5")}`, {
      auth: await afterTemporarySignIn(),
      routes: probes,
    })
    await choose("Limestone-2026")
    expect(await landedOn("/studio/products/5")).toBeInTheDocument()
  })

  it("shows Cognito's own message when it still refuses the password", async () => {
    const auth = await afterTemporarySignIn()
    auth.completeNewPassword.mockRejectedValueOnce(new AdminAuthError("invalid_password", "Password does not conform to policy: Password must have symbol characters"))
    renderStudioAt(<StudioNewPassword />, "/studio/sign-in/new-password", { auth })
    await choose("Limestone-2026")
    expect(await screen.findByRole("alert")).toHaveTextContent("Password does not conform to policy: Password must have symbol characters")
  })

  it("sends the admin back to sign in when the step has expired", async () => {
    renderStudioAt(<StudioNewPassword />, "/studio/sign-in/new-password", { auth: fakeAdminAuth() })
    await choose("Limestone-2026")
    expect(await screen.findByRole("alert")).toHaveTextContent(t.expired)
    expect(screen.getByRole("link", { name: t.backToSignIn })).toHaveAttribute("href", "/studio/sign-in")
  })
})
