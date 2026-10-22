import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { Mock } from "vitest"
import { en } from "@/i18n/messages/en"
import { renderAt } from "@/test/render"
import { mailtoFor, messageText } from "./contact-message"
import ContactForm, { type Opener } from "./ContactForm"

const WHATSAPP = /^https:\/\/wa\.me\/96171284863\?text=/
const filled = { name: "Rami Nasr", email: "rami@example.com", phone: "71 234 567", message: "Is Batroun available?" }
const body = "Is Batroun available?\n\nRami Nasr\nrami@example.com\n+961 71 234 567"

interface FakeOpener extends Opener {
  newTab: Mock<Opener["newTab"]>
  sameTab: Mock<Opener["sameTab"]>
  copy: Mock<Opener["copy"]>
}

function fakeOpener(copy = vi.fn<Opener["copy"]>(() => Promise.resolve())): FakeOpener {
  return { newTab: vi.fn<Opener["newTab"]>(), sameTab: vi.fn<Opener["sameTab"]>(), copy }
}

function setup({ opener = fakeOpener(), instagramHandle }: { opener?: FakeOpener; instagramHandle?: string | null } = {}) {
  const user = userEvent.setup()
  renderAt(<ContactForm opener={opener} instagramHandle={instagramHandle} />)
  return { user, opener }
}

async function fill(user: ReturnType<typeof userEvent.setup>, fields: Partial<typeof filled> = filled) {
  for (const [key, label] of [["name", "Name"], ["email", "Email"], ["phone", "Phone"], ["message", "Message"]] as const) {
    if (fields[key]) await user.type(screen.getByLabelText(label), fields[key])
  }
}

const subscriberCalls = () =>
  vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith("/subscribers")).map(([, init]) => JSON.parse(String(init?.body)))

describe("ContactForm", () => {
  it("offers three ways to send: WhatsApp, email, and Instagram once its handle is set", () => {
    setup({ instagramHandle: "glowstone.test" })
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Send on WhatsApp", "Send by email", "Send on Instagram"])
  })

  it("hides the Instagram button while the handle is not set", () => {
    setup({ instagramHandle: null })
    expect(screen.queryByRole("button", { name: /Instagram/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole("button")).toHaveLength(2)
  })

  it("opens nothing and sends nothing until every field is filled, and says what's missing", async () => {
    const { user, opener } = setup()
    await user.click(screen.getByRole("button", { name: "Send on WhatsApp" }))
    expect(opener.newTab).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
    expect(screen.getAllByText("Please fill this in.")).toHaveLength(4)
    for (const label of ["Name", "Email", "Phone", "Message"]) expect(screen.getByLabelText(label)).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByLabelText("Name")).toHaveFocus()
  })

  it("rejects an email address that can't be right", async () => {
    const { user, opener } = setup()
    await fill(user, { ...filled, email: "rami@gmail" })
    await user.click(screen.getByRole("button", { name: "Send by email" }))
    expect(screen.getByText("Please enter a valid email address.")).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toHaveFocus()
    expect(opener.sameTab).not.toHaveBeenCalled()
  })

  it("asks for a Lebanese phone number, with the sign-up's rule", async () => {
    const { user, opener } = setup()
    await fill(user, { ...filled, phone: "12 34" })
    await user.click(screen.getByRole("button", { name: "Send on WhatsApp" }))
    expect(screen.getByText("Please enter a Lebanese number, like 71 234 567.")).toBeInTheDocument()
    expect(screen.getByLabelText("Phone")).toHaveFocus()
    expect(opener.newTab).not.toHaveBeenCalled()
  })

  it("opens WhatsApp in a new tab with the question and the visitor's details", async () => {
    const { user, opener } = setup()
    await fill(user)
    await user.click(screen.getByRole("button", { name: "Send on WhatsApp" }))
    expect(opener.newTab).toHaveBeenCalledTimes(1)
    const url = new URL(opener.newTab.mock.calls[0][0] as string)
    expect(url.origin + url.pathname).toBe("https://wa.me/96171284863")
    expect(url.searchParams.get("text")).toBe(body)
    expect(screen.getByRole("status")).toHaveTextContent("WhatsApp opens in a new tab with your message. Send it from there.")
    // The form stays filled, so the visitor can still try another way.
    expect(screen.getByLabelText("Message")).toHaveValue("Is Batroun available?")
  })

  it("opens the mail app with a subject and the same details", async () => {
    const { user, opener } = setup()
    await fill(user)
    await user.click(screen.getByRole("button", { name: "Send by email" }))
    expect(opener.sameTab).toHaveBeenCalledTimes(1)
    const url = new URL(opener.sameTab.mock.calls[0][0] as string)
    expect(url.protocol + url.pathname).toBe("mailto:glowstone216@gmail.com")
    expect(url.searchParams.get("subject")).toBe("Question from Rami Nasr")
    expect(url.searchParams.get("body")).toBe(body)
    expect(screen.getByRole("status")).toHaveTextContent("Your email app opens with your message. If nothing opens, write to glowstone216@gmail.com.")
  })

  it("on Instagram, copies the message first, then opens the chat, then says to paste it", async () => {
    const opener = fakeOpener()
    const { user } = setup({ instagramHandle: "glowstone.test", opener })
    await fill(user)
    await user.click(screen.getByRole("button", { name: "Send on Instagram" }))
    expect(opener.copy).toHaveBeenCalledWith(body)
    expect(opener.newTab).toHaveBeenCalledWith("https://ig.me/m/glowstone.test")
    expect(opener.copy.mock.invocationCallOrder[0]).toBeLessThan(opener.newTab.mock.invocationCallOrder[0])
    expect(await screen.findByText("Message copied. Paste it in the chat.")).toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: "Your message" })).not.toBeInTheDocument()
  })

  it("on Instagram, shows the message to copy by hand when copying fails", async () => {
    const opener = fakeOpener(vi.fn(() => Promise.reject(new Error("denied"))))
    const { user } = setup({ instagramHandle: "glowstone.test", opener })
    await fill(user)
    await user.click(screen.getByRole("button", { name: "Send on Instagram" }))
    expect(opener.newTab).toHaveBeenCalledWith("https://ig.me/m/glowstone.test")
    const box = await screen.findByRole("textbox", { name: "Your message" })
    expect(box).toHaveValue(body)
    expect(box).toHaveAttribute("readonly")
    expect(screen.getByText("Copy your message below and paste it in the chat.")).toBeInTheDocument()
    expect(screen.queryByText("Message copied. Paste it in the chat.")).not.toBeInTheDocument()
  })

  it.each([
    ["Send on WhatsApp", "newTab"],
    ["Send by email", "sameTab"],
    ["Send on Instagram", "newTab"],
  ] as const)("%s: adds the email to the news list first, quietly (rejoin false)", async (name, open) => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetch)
    const { user, opener } = setup({ instagramHandle: "glowstone.test" })
    await fill(user, { ...filled, email: "  Rami@Example.com " })
    await user.click(screen.getByRole("button", { name }))
    expect(subscriberCalls()).toEqual([{ email: "Rami@Example.com", rejoin: false, website: "" }])
    expect(fetch.mock.invocationCallOrder[0]).toBeLessThan(opener[open].mock.invocationCallOrder[0])
  })

  it("opens the app in the same tap, without waiting for the news list, and even when the API is down", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})))
    const { user, opener } = setup()
    await fill(user)
    await user.click(screen.getByRole("button", { name: "Send on WhatsApp" }))
    expect(opener.newTab).toHaveBeenCalledWith(expect.stringMatching(WHATSAPP))

    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))))
    await user.click(screen.getByRole("button", { name: "Send by email" }))
    expect(opener.sameTab).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/email app/))
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("carries the hidden spam-trap field, out of sight and out of reach", () => {
    const { container } = renderAt(<ContactForm opener={fakeOpener()} />)
    const trap = container.querySelector<HTMLInputElement>('input[name="website"]')!
    expect(trap).toHaveAttribute("tabindex", "-1")
    expect(trap).toHaveAttribute("autocomplete", "off")
    expect(trap).toHaveAttribute("aria-hidden", "true")
    expect(trap).toHaveClass("sr-only")
    expect(screen.queryByRole("textbox", { name: /website/i })).not.toBeInTheDocument()
  })

  it("sends what a bot typed into the trap, so the API can drop it", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetch)
    const { user } = setup()
    await fill(user)
    const trap = document.querySelector<HTMLInputElement>('input[name="website"]')!
    await user.type(trap, "http://spam.test")
    await user.click(screen.getByRole("button", { name: "Send on WhatsApp" }))
    expect(subscriberCalls()[0].website).toBe("http://spam.test")
  })
})

describe("contact message", () => {
  it("puts the question first, then the name, email and phone on their own lines", () => {
    expect(messageText({ name: " Rami ", email: "r@x.com ", phone: "03 123 456", message: " Hello & welcome \n" })).toBe("Hello & welcome\n\nRami\nr@x.com\n+961 3 123 456")
  })

  it("builds the email with the subject and that text", () => {
    const url = new URL(mailtoFor({ name: "Rami", email: "r@x.com", phone: "71234567", message: "Hello & welcome" }, "shop@x.com", en))
    expect(url.protocol + url.pathname).toBe("mailto:shop@x.com")
    expect(url.searchParams.get("subject")).toBe("Question from Rami")
    expect(url.searchParams.get("body")).toBe("Hello & welcome\n\nRami\nr@x.com\n+961 71 234 567")
  })
})
