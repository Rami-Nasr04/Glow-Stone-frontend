import { screen } from "@testing-library/react"
import { AdminAuthError } from "@/features/studio/auth/types"
import { STUDIO_COPY } from "@/features/studio/copy"
import Landed from "@/test/Landed"
import { landedOn, renderStudioAt } from "@/test/render-studio"
import { fakeAdminAuth, setupUser } from "@/test/studio"
import StudioForgotPassword from "./StudioForgotPassword"

const t = STUDIO_COPY.forgot
const probes = [
  { path: "/studio/products", Component: Landed },
  { path: "/studio/products/:id", Component: Landed },
]

async function askForCode(email = "omar@example.com") {
  const user = setupUser()
  await user.type(screen.getByLabelText(STUDIO_COPY.email), email)
  await user.click(screen.getByRole("button", { name: t.send }))
}

async function finish(code = "123456", password = "Limestone-2026", repeat = password) {
  const user = setupUser()
  await user.click(screen.getByRole("textbox", { name: "Digit 1" }))
  await user.paste(code)
  await user.type(screen.getByLabelText(STUDIO_COPY.newPassword.password), password)
  await user.type(screen.getByLabelText(STUDIO_COPY.newPassword.repeat), repeat)
  await user.click(screen.getByRole("button", { name: t.save }))
}

describe("the studio's reset-password page", () => {
  it("answers every email the same way", async () => {
    const auth = fakeAdminAuth()
    renderStudioAt(<StudioForgotPassword />, "/studio/forgot-password", { auth })
    await askForCode(" omar@example.com ")
    expect(await screen.findByText(t.sent)).toBeInTheDocument()
    expect(auth.startPasswordReset).toHaveBeenCalledWith("omar@example.com")
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(t.codeTitle)
  })

  it("checks the email before asking Cognito", async () => {
    const auth = fakeAdminAuth()
    renderStudioAt(<StudioForgotPassword />, "/studio/forgot-password", { auth })
    await askForCode("not-an-email")
    expect(screen.getByLabelText(STUDIO_COPY.email)).toHaveAccessibleDescription(STUDIO_COPY.invalidEmail)
    expect(auth.startPasswordReset).not.toHaveBeenCalled()
  })

  it("explains why the reset is needed when sign-in required it", () => {
    renderStudioAt(<StudioForgotPassword />, "/studio/forgot-password?email=omar%40example.com&reset=required")
    expect(screen.getByText(t.resetRequired)).toBeInTheDocument()
    expect(screen.getByLabelText(STUDIO_COPY.email)).toHaveValue("omar@example.com")
  })

  it("admits only a network failure", async () => {
    const auth = fakeAdminAuth()
    auth.startPasswordReset.mockRejectedValueOnce(new AdminAuthError("unavailable"))
    renderStudioAt(<StudioForgotPassword />, "/studio/forgot-password", { auth })
    await askForCode()
    expect(await screen.findByRole("alert")).toHaveTextContent(STUDIO_COPY.unavailable)
    expect(screen.queryByText(t.sent)).not.toBeInTheDocument()
  })

  it("sets the new password with the code, signs in and opens the studio", async () => {
    const auth = fakeAdminAuth()
    renderStudioAt(<StudioForgotPassword />, "/studio/forgot-password", { auth, routes: probes })
    await askForCode()
    await finish()
    expect(await landedOn("/studio/products")).toBeInTheDocument()
    expect(auth.finishPasswordReset).toHaveBeenCalledWith("omar@example.com", "123456", "Limestone-2026")
  })

  it("checks the code, the policy and the repeat first", async () => {
    const auth = fakeAdminAuth()
    renderStudioAt(<StudioForgotPassword />, "/studio/forgot-password", { auth })
    await askForCode()
    await setupUser().click(screen.getByRole("button", { name: t.save }))
    expect(screen.getByText(t.codeMissing)).toBeInTheDocument()
    await finish("123456", "short")
    expect(screen.getByLabelText(STUDIO_COPY.newPassword.password)).toHaveAccessibleDescription(expect.stringContaining(STUDIO_COPY.newPassword.weak))
    expect(auth.finishPasswordReset).not.toHaveBeenCalled()
  })

  it("explains a wrong code and an expired one, and sends a new code", async () => {
    const auth = fakeAdminAuth()
    auth.finishPasswordReset.mockRejectedValueOnce(new AdminAuthError("wrong_code")).mockRejectedValueOnce(new AdminAuthError("expired_code"))
    renderStudioAt(<StudioForgotPassword />, "/studio/forgot-password", { auth })
    await askForCode()
    await finish("000000")
    expect(await screen.findByText(t.wrongCode)).toBeInTheDocument()
    await setupUser().click(screen.getByRole("button", { name: t.save }))
    expect(await screen.findByText(t.expiredCode)).toBeInTheDocument()
    await setupUser().click(screen.getByRole("button", { name: t.sendAgain }))
    expect(auth.startPasswordReset).toHaveBeenCalledTimes(2)
  })

  it("shows Cognito's own message when it refuses the password", async () => {
    const auth = fakeAdminAuth()
    auth.finishPasswordReset.mockRejectedValueOnce(new AdminAuthError("invalid_password", "Password does not conform to policy"))
    renderStudioAt(<StudioForgotPassword />, "/studio/forgot-password", { auth })
    await askForCode()
    await finish()
    expect(await screen.findByRole("alert")).toHaveTextContent("Password does not conform to policy")
  })
})
