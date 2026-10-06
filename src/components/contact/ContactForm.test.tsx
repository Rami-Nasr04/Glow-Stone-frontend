import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { en } from "@/i18n/messages/en"
import { renderAt } from "@/test/render"
import { mailtoFor } from "./contact-message"
import ContactForm from "./ContactForm"

describe("ContactForm", () => {
  it("sends nothing when empty and says what's missing next to each field", async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()
    renderAt(<ContactForm onSend={onSend} />)
    await user.click(screen.getByRole("button", { name: "Send" }))
    expect(onSend).not.toHaveBeenCalled()
    expect(screen.getAllByText("Please fill this in.")).toHaveLength(3)
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByLabelText("Name")).toHaveFocus()
    expect(screen.getByLabelText("Phone (optional)")).not.toHaveAttribute("aria-invalid", "true")
  })

  it("rejects an email address that can't be right", async () => {
    const user = userEvent.setup()
    renderAt(<ContactForm onSend={vi.fn()} />)
    await user.type(screen.getByLabelText("Name"), "Rami")
    await user.type(screen.getByLabelText("Email"), "rami@gmail")
    await user.type(screen.getByLabelText("Message"), "Is Batroun available?")
    await user.click(screen.getByRole("button", { name: "Send" }))
    expect(screen.getByText("Please enter a valid email address.")).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toHaveFocus()
  })

  it("hands a valid message to the mail app and says so honestly", async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()
    renderAt(<ContactForm onSend={onSend} />)
    await user.type(screen.getByLabelText("Name"), "Rami Nasr")
    await user.type(screen.getByLabelText("Email"), "rami@example.com")
    await user.type(screen.getByLabelText("Message"), "Is Batroun available?")
    await user.click(screen.getByRole("button", { name: "Send" }))
    expect(onSend).toHaveBeenCalledWith(expect.stringMatching(/^mailto:glowstone216@gmail\.com\?subject=/))
    expect(screen.getByText(/Your email app has opened/)).toBeInTheDocument()
  })

  it("builds the email with the visitor's details", () => {
    const link = mailtoFor({ name: "Rami", email: "r@x.com", phone: "+961 1", message: "Hello & welcome" }, "shop@x.com", en)
    const url = new URL(link)
    expect(url.protocol).toBe("mailto:")
    expect(url.searchParams.get("subject")).toBe("Message from Rami")
    expect(url.searchParams.get("body")).toBe("Hello & welcome\n\nRami\nr@x.com\n+961 1")
  })
})
